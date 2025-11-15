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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContractorFormData>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      trackPRs: false,
    },
  })

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
          },
        ])

      if (error) {
        throw error
      }

      setSubmitSuccess(true)
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
          <input
            type="text"
            id="githubLogin"
            {...register('githubLogin')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="e.g., johndoe"
          />
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

