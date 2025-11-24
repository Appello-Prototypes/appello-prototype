import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { googleAuthAPI } from '../services/api'
import toast from 'react-hot-toast'
import { LinkIcon } from '@heroicons/react/24/outline'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [connecting, setConnecting] = useState(false)

  // Check for error in URL params
  React.useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      toast.error(decodeURIComponent(error))
      // Clean URL
      window.history.replaceState({}, '', '/login')
    }
  }, [searchParams])

  const handleGoogleLogin = async () => {
    try {
      setConnecting(true)
      
      // Get OAuth URL for login (no auth required)
      // Note: redirectUri is handled by backend - Google redirects to backend, then backend redirects to frontend
      const response = await googleAuthAPI.getAuthUrl()
      
      if (!response.data.success || !response.data.authUrl) {
        throw new Error('Failed to get authorization URL')
      }
      
      const { authUrl } = response.data

      // Open popup window (HubSpot-style)
      const width = 500
      const height = 600
      const left = (window.screen.width - width) / 2
      const top = (window.screen.height - height) / 2

      const popup = window.open(
        authUrl,
        'Google Sign In',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      )

      if (!popup) {
        setConnecting(false)
        toast.error('Popup blocked. Please allow popups for this site.')
        return
      }

      // Listen for popup to close or navigate
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          setConnecting(false)
          // Check if we have a token (user might have logged in)
          if (localStorage.getItem('authToken')) {
            toast.success('Login successful!')
            navigate('/dashboard')
          } else {
            // Popup closed without completing auth
            toast.error('Login cancelled or popup was closed')
          }
        }
      }, 500)
      
      // Also check for navigation to callback page
      const checkNavigation = setInterval(() => {
        try {
          // Check if popup navigated to callback (might be same-origin)
          if (popup.location && popup.location.href.includes('/auth/callback')) {
            clearInterval(checkNavigation)
            // Don't close popup yet, let callback handle it
          }
        } catch (e) {
          // Cross-origin, can't access - that's fine
        }
      }, 500)

      // Listen for message from callback page
      const messageListener = (event) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          clearInterval(checkClosed)
          popup.close()
          setConnecting(false)
          localStorage.setItem('authToken', event.data.token)
          toast.success('Login successful!')
          navigate('/dashboard')
          window.removeEventListener('message', messageListener)
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          clearInterval(checkClosed)
          popup.close()
          setConnecting(false)
          toast.error(event.data.error || 'Login failed')
          window.removeEventListener('message', messageListener)
        }
      }

      window.addEventListener('message', messageListener)
    } catch (error) {
      setConnecting(false)
      console.error('Google login error:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to initiate Google login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Appello
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Task Management System
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <button
              onClick={handleGoogleLogin}
              disabled={connecting}
              className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Secure authentication</span>
            </div>
          </div>

          <div className="text-sm text-center text-gray-600">
            <p className="mb-2">
              <strong>Privacy & Security:</strong>
            </p>
            <ul className="text-left space-y-1 text-xs text-gray-500 max-w-sm mx-auto">
              <li>✓ Your Google account is used only for authentication</li>
              <li>✓ Gmail access is used only to send Purchase Orders</li>
              <li>✓ No passwords stored - secure OAuth2 flow</li>
              <li>✓ You can revoke access anytime in Google settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

