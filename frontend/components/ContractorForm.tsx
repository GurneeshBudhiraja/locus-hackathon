'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

const contractorSchema = z.object({
  githubLogin: z.string().min(1, 'GitHub login is required'),
  personName: z.string().min(1, 'Person name is required'),
  repoName: z.string().min(1, 'Repository name is required'),
  walletAddress: z.string().min(1, 'Wallet address is required'),
  role: z.string().min(1, 'Role is required'),
  trackPRs: z.boolean(),
  totalAmountPayable: z.string().min(1, 'Total amount payable is required').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Must be a valid positive number'
  ),
})

type ContractorFormData = z.infer<typeof contractorSchema>

export default function ContractorForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [metorialSessionId, setMetorialSessionId] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContractorFormData>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      trackPRs: false,
      githubLogin: '',
    },
  })

  const handleGitHubOAuth = async () => {
    setIsAuthenticating(true)
    try {
      const response = await fetch('/api/github-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      })

      const data = await response.json()
      if (data.url && data.oauthSessionId) {
        setMetorialSessionId(data.oauthSessionId)
        // Open OAuth URL in a new tab
        window.open(data.url, '_blank')
        
        // Poll for OAuth completion
        pollOAuthCompletion(data.oauthSessionId)
      } else {
        throw new Error(data.error || 'Failed to create OAuth session')
      }
    } catch (error: any) {
      console.error('OAuth error:', error)
      alert(`Error: ${error.message || 'Failed to start GitHub OAuth'}`)
      setIsAuthenticating(false)
    }
  }

  const pollOAuthCompletion = async (sessionId: string) => {
    const maxAttempts = 120
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch('/api/github-oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'wait', oauthSessionId: sessionId }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.completed) {
          setIsAuthenticating(false)
          // Session ID is already stored in state, OAuth is complete
          alert('GitHub OAuth completed! Session ID saved. Please enter your GitHub username manually.')
        } else if (data.completed === false) {
          if (attempts < maxAttempts) {
            attempts++
            setTimeout(poll, 3000)
          } else {
            setIsAuthenticating(false)
            alert('OAuth timeout. Please try again.')
          }
        } else if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, 3000)
        } else {
          setIsAuthenticating(false)
          alert('OAuth timeout. Please try again.')
        }
      } catch (error: any) {
        console.error('Polling error:', error)
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, 3000)
        } else {
          setIsAuthenticating(false)
          alert(`OAuth error: ${error.message || 'Please try again.'}`)
        }
      }
    }

    poll()
  }

  const onSubmit = async (data: ContractorFormData) => {
    setIsSubmitting(true)
    setSubmitSuccess(false)

    try {
      const { error } = await supabase
        .from('contractors')
        .insert([
          {
            github_login: data.githubLogin,
            person_name: data.personName,
            repo_name: data.repoName,
            wallet_address: data.walletAddress,
            role: data.role,
            track_prs: data.trackPRs,
            total_amount_payable: parseFloat(data.totalAmountPayable),
            metorial_oauth_session_id: metorialSessionId || null,
          },
        ])

      if (error) {
        throw error
      }

      setSubmitSuccess(true)
      setMetorialSessionId('') // Clear session ID after successful submit
      reset()

      // Reset success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error: any) {
      console.error('Error submitting form:', error)
      alert(`Error: ${error.message || 'Failed to submit contractor information'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* GitHub Login */}
        <div>
          <label
            htmlFor="githubLogin"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            GitHub Login <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                id="githubLogin"
                {...register('githubLogin')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., johndoe"
              />
              <button
                type="button"
                onClick={handleGitHubOAuth}
                disabled={isAuthenticating}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
              >
                {isAuthenticating ? 'Authenticating...' : 'OAuth'}
              </button>
            </div>
            {metorialSessionId && (
              <p className="text-xs text-green-600">
                ✓ OAuth session ID: {metorialSessionId.substring(0, 20)}...
              </p>
            )}
          </div>
          {errors.githubLogin && (
            <p className="mt-1 text-sm text-red-600">{errors.githubLogin.message}</p>
          )}
        </div>

        {/* Person Name */}
        <div>
          <label
            htmlFor="personName"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Person Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="personName"
            {...register('personName')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="e.g., John Doe"
          />
          {errors.personName && (
            <p className="mt-1 text-sm text-red-600">{errors.personName.message}</p>
          )}
        </div>

        {/* Repo Name */}
        <div>
          <label
            htmlFor="repoName"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Repository Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="repoName"
            {...register('repoName')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="e.g., my-project"
          />
          {errors.repoName && (
            <p className="mt-1 text-sm text-red-600">{errors.repoName.message}</p>
          )}
        </div>

        {/* Wallet Address */}
        <div>
          <label
            htmlFor="walletAddress"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Wallet Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="walletAddress"
            {...register('walletAddress')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
            placeholder="0x..."
          />
          {errors.walletAddress && (
            <p className="mt-1 text-sm text-red-600">{errors.walletAddress.message}</p>
          )}
        </div>

        {/* Role */}
        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Role <span className="text-red-500">*</span>
          </label>
          <select
            id="role"
            {...register('role')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">Select a role</option>
            <option value="developer">Developer</option>
            <option value="designer">Designer</option>
            <option value="project-manager">Project Manager</option>
            <option value="contractor">Contractor</option>
            <option value="other">Other</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
          )}
        </div>

        {/* Total Amount Payable */}
        <div>
          <label
            htmlFor="totalAmountPayable"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Total Amount Payable <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="totalAmountPayable"
            {...register('totalAmountPayable')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="e.g., 1000"
          />
          {errors.totalAmountPayable && (
            <p className="mt-1 text-sm text-red-600">{errors.totalAmountPayable.message}</p>
          )}
        </div>
      </div>

      {/* GitHub PR Tracking Toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="trackPRs"
          {...register('trackPRs')}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="trackPRs"
          className="ml-3 block text-sm font-medium text-gray-700"
        >
          Enable GitHub PR Tracking
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4">
        <div>
          {submitSuccess && (
            <p className="text-sm text-green-600 font-medium">
              ✓ Contractor information submitted successfully!
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  )
}

