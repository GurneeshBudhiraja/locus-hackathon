'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface PullRequest {
  id: string
  pr_number: number
  pr_title: string
  pr_state: string
  pr_url: string
  pr_author: string
  pr_created_at: string
  pr_updated_at: string
  pr_merged_at: string | null
  amount_payable: number | null
  is_paid: boolean
}

interface PaymentSummary {
  totalPaid: number
  totalPending: number
  remainingAmount: number
  totalAmountPayable: number
}

interface Contractor {
  id: string
  person_name: string
  wallet_address: string
  repo_owner: string
  repo_name: string
  github_login: string
}

export default function PRsDashboard({ contractorId }: { contractorId?: string }) {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [selectedContractorId, setSelectedContractorId] = useState<string>(contractorId || '')
  const [prs, setPRs] = useState<PullRequest[]>([])
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null)
  const [isLoadingPRs, setIsLoadingPRs] = useState(false)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)

  // Fetch all contractors on mount
  useEffect(() => {
    const fetchContractors = async () => {
      const { data, error } = await supabase
        .from('contractors')
        .select('id, person_name, wallet_address, repo_owner, repo_name, github_login')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setContractors(data)
        if (data.length > 0 && !contractorId) {
          setSelectedContractorId(data[0].id)
        }
      }
    }

    fetchContractors()
  }, [contractorId])

  // Fetch PRs when contractor is selected
  useEffect(() => {
    if (selectedContractorId) {
      fetchPRs()
      fetchPaymentSummary()
    }
  }, [selectedContractorId])

  const fetchPRs = async () => {
    if (!selectedContractorId) return

    setIsLoadingPRs(true)
    try {
      const response = await fetch(`/api/github-prs?contractorId=${selectedContractorId}`)
      const data = await response.json()

      if (response.ok) {
        setPRs(data.prs || [])
      } else {
        console.error('Error fetching PRs:', data.error)
        alert(`Error: ${data.error}`)
      }
    } catch (error: any) {
      console.error('Error fetching PRs:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoadingPRs(false)
    }
  }

  const fetchPaymentSummary = async () => {
    if (!selectedContractorId) return

    setIsLoadingSummary(true)
    try {
      const response = await fetch(`/api/payments/summary?contractorId=${selectedContractorId}`)
      const data = await response.json()

      if (response.ok) {
        setPaymentSummary(data.summary)
      } else {
        console.error('Error fetching payment summary:', data.error)
      }
    } catch (error: any) {
      console.error('Error fetching payment summary:', error)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const selectedContractor = contractors.find(c => c.id === selectedContractorId)

  return (
    <div className="space-y-6">
      {/* Contractor Selector */}
      {contractors.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Contractor
          </label>
          <select
            value={selectedContractorId}
            onChange={(e) => setSelectedContractorId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">Select a contractor...</option>
            {contractors.map((contractor) => (
              <option key={contractor.id} value={contractor.id}>
                {contractor.person_name} ({contractor.repo_owner}/{contractor.repo_name})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedContractorId && selectedContractor && (
        <>
          {/* Payment Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Payment Summary - {selectedContractor.person_name}
            </h3>
            {isLoadingSummary ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : paymentSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Amount Payable</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${paymentSummary.totalAmountPayable.toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${paymentSummary.totalPaid.toFixed(2)}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    ${paymentSummary.totalPending.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Remaining</p>
                  <p className="text-2xl font-bold text-gray-600">
                    ${paymentSummary.remainingAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No payment data available</p>
            )}
          </div>

          {/* Pull Requests */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Pull Requests - {selectedContractor.repo_owner}/{selectedContractor.repo_name}
              </h3>
              <button
                onClick={fetchPRs}
                disabled={isLoadingPRs}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingPRs ? 'Refreshing...' : 'Refresh PRs'}
              </button>
            </div>

            {isLoadingPRs ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Fetching PRs from GitHub...</p>
              </div>
            ) : prs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pull requests found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PR #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        State
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {prs.map((pr) => (
                      <tr key={pr.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{pr.pr_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <a
                            href={pr.pr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {pr.pr_title}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              pr.pr_state === 'merged' || pr.pr_state === 'closed'
                                ? 'bg-green-100 text-green-800'
                                : pr.pr_state === 'open'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {pr.pr_state}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pr.pr_author}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${pr.amount_payable?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {pr.is_paid ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Paid
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <a
                            href={pr.pr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedContractorId && contractors.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No contractors found. Please add a contractor first.</p>
          <a
            href="/dashboard/setup"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Contractor
          </a>
        </div>
      )}
    </div>
  )
}

