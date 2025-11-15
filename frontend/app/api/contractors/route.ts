import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/contractors - Get all contractors
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ contractors: data }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/contractors - Create a new contractor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['githubLogin', 'personName', 'repoName', 'walletAddress', 'role', 'totalAmountPayable']
    const missingFields = requiredFields.filter(field => !body[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('contractors')
      .insert([
        {
          github_login: body.githubLogin,
          person_name: body.personName,
          repo_name: body.repoName,
          wallet_address: body.walletAddress,
          role: body.role,
          track_prs: body.trackPRs || false,
          total_amount_payable: parseFloat(body.totalAmountPayable),
        },
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ contractor: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

