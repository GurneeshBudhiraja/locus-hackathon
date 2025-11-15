import { NextRequest, NextResponse } from 'next/server'
import { Metorial } from 'metorial'
import Anthropic from '@anthropic-ai/sdk'

const metorial = new Metorial({ 
  apiKey: process.env.METORIAL_API_KEY || '' 
})

const anthropic = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY || '' 
})

// POST /api/github-oauth - Create GitHub OAuth session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, oauthSessionId } = body

    if (action === 'create') {
      // Create new OAuth session
      const githubOAuthSession = await metorial.oauth.sessions.create({
        serverDeploymentId: process.env.GITHUB_SERVER_DEPLOYMENT_ID || ''
      })

      return NextResponse.json({
        oauthSessionId: githubOAuthSession.id,
        url: githubOAuthSession.url
      }, { status: 200 })
    }

    if (action === 'wait') {
      // Check OAuth completion status
      if (!oauthSessionId) {
        return NextResponse.json(
          { error: 'oauthSessionId is required' },
          { status: 400 }
        )
      }

      // First, try to get session info to check if it's completed
      try {
        const sessionInfo: any = await metorial.oauth.sessions.get(oauthSessionId)
        
        // Check if session is completed (adjust based on actual Metorial API response)
        const isCompleted = sessionInfo?.status === 'completed' || 
                           sessionInfo?.completed === true ||
                           sessionInfo?.oauthSession?.status === 'completed'
        
        if (!isCompleted) {
          // Try waitForCompletion with a short timeout
          try {
            const session = { id: oauthSessionId }
            await Promise.race([
              metorial.oauth.waitForCompletion([session]),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ])
          } catch (waitError: any) {
            // If timeout or not completed, return not completed
            if (waitError.message === 'timeout' || 
                waitError.message?.includes('not completed') || 
                waitError.message?.includes('pending')) {
              return NextResponse.json({
                completed: false,
                message: 'OAuth not completed yet'
              }, { status: 200 })
            }
            // If other error, continue to try getting user info
          }
        }
      } catch (sessionError: any) {
        // If we can't get session info, try waitForCompletion anyway
        try {
          const session = { id: oauthSessionId }
          await Promise.race([
            metorial.oauth.waitForCompletion([session]),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ])
        } catch (waitError: any) {
          if (waitError.message === 'timeout' || 
              waitError.message?.includes('not completed') || 
              waitError.message?.includes('pending')) {
            return NextResponse.json({
              completed: false,
              message: 'OAuth not completed yet'
            }, { status: 200 })
          }
        }
      }

      // OAuth is complete - just verify and return completion status
      // User will enter GitHub username manually
      try {
        const sessionInfo: any = await metorial.oauth.sessions.get(oauthSessionId)
        
        // Verify session is completed
        if (sessionInfo?.status !== 'completed') {
          return NextResponse.json({
            completed: false,
            message: 'OAuth session not completed yet'
          }, { status: 200 })
        }
        
        console.log('OAuth session completed. Session ID:', oauthSessionId)
        
        // Just return completion - user will enter username manually
        return NextResponse.json({
          completed: true,
          oauthSessionId: oauthSessionId
        }, { status: 200 })
      } catch (sessionError: any) {
        console.error('Error getting session info:', sessionError)
        return NextResponse.json({
          completed: false,
          message: 'Error checking OAuth status',
          error: sessionError.message
        }, { status: 200 })
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "create" or "wait"' },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'OAuth error' },
      { status: 500 }
    )
  }
}

