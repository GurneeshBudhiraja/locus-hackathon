'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OAuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Checking authentication...')

  useEffect(() => {
    // Get the session ID from localStorage
    const sessionId = localStorage.getItem('github_oauth_session_id')
    
    if (sessionId) {
      // Redirect to dashboard - the form will handle polling
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } else {
      setStatus('No OAuth session found. Redirecting...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{status}</p>
        <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}

