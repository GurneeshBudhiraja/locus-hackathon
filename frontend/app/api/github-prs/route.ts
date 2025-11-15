import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Metorial } from 'metorial'
import Anthropic from '@anthropic-ai/sdk'

const metorial = new Metorial({ 
  apiKey: process.env.METORIAL_API_KEY || '' 
})

const anthropic = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY || '' 
})

// GET /api/github-prs?contractorId=xxx - Fetch PRs for a contractor
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contractorId = searchParams.get('contractorId')

    if (!contractorId) {
      return NextResponse.json(
        { error: 'contractorId is required' },
        { status: 400 }
      )
    }

    // Get contractor info from database
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', contractorId)
      .single()

    if (contractorError || !contractor) {
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      )
    }

    if (!contractor.metorial_oauth_session_id) {
      return NextResponse.json(
        { error: 'No OAuth session found for this contractor' },
        { status: 400 }
      )
    }

    // Use Metorial's list_pull_requests tool to fetch PRs from GitHub
    try {
      const result = await metorial.run({
        message: `Call the list_pull_requests tool with these exact parameters:
- owner: "${contractor.repo_owner}"
- repo: "${contractor.repo_name}"
- state: "all" (to get open, closed, and merged PRs)
- per_page: 100 (to get as many PRs as possible)

Return the complete list of pull requests as a JSON array.`,
        serverDeployments: [
          { 
            serverDeploymentId: process.env.GITHUB_SERVER_DEPLOYMENT_ID || '', 
            oauthSessionId: contractor.metorial_oauth_session_id 
          }
        ],
        client: anthropic,
        model: 'claude-sonnet-4-5'
      })

      // Parse the PR data from Metorial response
      let prs: any[] = []
      try {
        // Metorial should return structured data from the tool
        // First, check if result has a tools or data property (using type assertion)
        const resultAny = result as any
        if (resultAny.tools && Array.isArray(resultAny.tools)) {
          // Look for list_pull_requests tool result
          const prToolResult = resultAny.tools.find((tool: any) => 
            tool.name === 'list_pull_requests' || tool.type === 'list_pull_requests'
          )
          if (prToolResult && prToolResult.result) {
            prs = Array.isArray(prToolResult.result) ? prToolResult.result : [prToolResult.result]
          }
        }

        // If no tools result, try parsing from text (Metorial returns JSON in markdown code blocks)
        if (prs.length === 0 && result.text) {
          // Extract JSON from markdown code blocks (```json ... ```)
          const codeBlockMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/)
          if (codeBlockMatch && codeBlockMatch[1]) {
            try {
              const parsed = JSON.parse(codeBlockMatch[1].trim())
              prs = Array.isArray(parsed) ? parsed : [parsed]
            } catch (parseError) {
              console.warn('Failed to parse JSON from code block:', parseError)
            }
          }
          
          // Fallback: Try to parse JSON array directly from text
          if (prs.length === 0) {
            const jsonArrayMatch = result.text.match(/\[\s*\{[\s\S]*\}\s*\]/)
            if (jsonArrayMatch) {
              try {
                const parsed = JSON.parse(jsonArrayMatch[0])
                prs = Array.isArray(parsed) ? parsed : [parsed]
              } catch (parseError) {
                console.warn('Failed to parse JSON array from text:', parseError)
              }
            }
          }
          
          // Last fallback: Check for structured data
          if (prs.length === 0 && resultAny.data && Array.isArray(resultAny.data)) {
            prs = resultAny.data
          }
        }

        // Empty array is valid (no PRs in repository) - don't treat as error
        // Only log if we couldn't parse anything at all
        if (prs.length === 0 && result.text && !result.text.includes('[]') && !result.text.includes('empty')) {
          console.warn('No PRs found in Metorial response:', JSON.stringify(result, null, 2))
        }
      } catch (parseError: any) {
        console.error('Error parsing PR data:', parseError)
        console.error('Full result:', JSON.stringify(result, null, 2))
        return NextResponse.json(
          { error: 'Failed to parse PR data from GitHub', details: parseError.message },
          { status: 500 }
        )
      }

      // Store PRs in database
      // Normalize PR data structure from GitHub API format
      const prsToInsert = prs.map((pr: any) => {
        // Extract PR number (GitHub API uses 'number')
        const prNumber = pr.number || pr.pr_number || pr.id
        
        // Extract PR title
        const prTitle = pr.title || pr.pr_title || 'Untitled PR'
        
        // Determine PR state: if merged_at exists, it's merged; otherwise use state
        let prState = (pr.state || pr.pr_state || 'open').toLowerCase()
        if (pr.merged_at && prState === 'closed') {
          prState = 'merged'
        }
        
        // Extract PR URL (GitHub API uses 'html_url')
        const prUrl = pr.html_url || pr.url || pr.pr_url || `https://github.com/${contractor.repo_owner}/${contractor.repo_name}/pull/${prNumber}`
        
        // Extract PR author (GitHub API uses 'user.login')
        const prAuthor = pr.user?.login || pr.author?.login || pr.author || 'unknown'
        
        // Extract timestamps (GitHub API uses ISO format)
        const prCreatedAt = pr.created_at || pr.createdAt || pr.created || new Date().toISOString()
        const prUpdatedAt = pr.updated_at || pr.updatedAt || pr.updated || new Date().toISOString()
        const prMergedAt = pr.merged_at || pr.mergedAt || null

        return {
          contractor_id: contractorId,
          pr_number: prNumber,
          pr_title: prTitle,
          pr_state: prState,
          pr_url: prUrl,
          pr_author: prAuthor,
          pr_created_at: prCreatedAt,
          pr_updated_at: prUpdatedAt,
          pr_merged_at: prMergedAt,
          amount_payable: contractor.total_amount_payable || null,
          is_paid: false
        }
      })

      // Upsert PRs (update if exists, insert if new)
      for (const pr of prsToInsert) {
        const { error: upsertError } = await supabase
          .from('pull_requests')
          .upsert(pr, {
            onConflict: 'contractor_id,pr_number',
            ignoreDuplicates: false
          })

        if (upsertError) {
          console.error('Error upserting PR:', upsertError)
        }
      }

      // Fetch stored PRs from database
      const { data: storedPRs, error: fetchError } = await supabase
        .from('pull_requests')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('pr_created_at', { ascending: false })

      if (fetchError) {
        return NextResponse.json(
          { error: fetchError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ prs: storedPRs || [] }, { status: 200 })
    } catch (metorialError: any) {
      console.error('Metorial error:', metorialError)
      return NextResponse.json(
        { error: 'Failed to fetch PRs from GitHub', details: metorialError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

