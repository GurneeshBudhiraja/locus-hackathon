import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/payments/summary?contractorId=xxx - Get payment summary for a contractor
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

    // Get contractor info
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

    // Get all payments for this contractor
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      return NextResponse.json(
        { error: paymentsError.message },
        { status: 500 }
      )
    }

    // Calculate totals
    const totalPaid = payments
      ?.filter(p => p.payment_status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0

    const totalPending = payments
      ?.filter(p => p.payment_status === 'pending')
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0

    const totalAmountPayable = parseFloat(contractor.total_amount_payable.toString())
    const remainingAmount = totalAmountPayable - totalPaid

    return NextResponse.json({
      contractor: {
        id: contractor.id,
        personName: contractor.person_name,
        walletAddress: contractor.wallet_address,
        totalAmountPayable: totalAmountPayable
      },
      summary: {
        totalPaid,
        totalPending,
        remainingAmount,
        totalAmountPayable
      },
      payments: payments || []
    }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

