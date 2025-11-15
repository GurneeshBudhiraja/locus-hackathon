import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/contractors/search - Search contractors by various fields
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const githubLogin = searchParams.get('githubLogin')
    const walletAddress = searchParams.get('walletAddress')
    const repoName = searchParams.get('repoName')
    const role = searchParams.get('role')

    let query = supabase.from('contractors').select('*')

    if (githubLogin) {
      query = query.eq('github_login', githubLogin)
    }
    if (walletAddress) {
      query = query.eq('wallet_address', walletAddress)
    }
    if (repoName) {
      query = query.eq('repo_name', repoName)
    }
    if (role) {
      query = query.eq('role', role)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

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

