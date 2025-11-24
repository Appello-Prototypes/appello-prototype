import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { googleAuthAPI } from '../services/api'
import toast from 'react-hot-toast'
import { CheckCircleIcon, XCircleIcon, LinkIcon } from '@heroicons/react/24/outline'

export default function Settings() {
  const queryClient = useQueryClient()
  const [connecting, setConnecting] = useState(false)

  const { data: googleStatus, isLoading, error: statusError } = useQuery({
    queryKey: ['google-connection-status'],
    queryFn: () => googleAuthAPI.getConnectionStatus().then(res => res.data),
    retry: false, // Don't retry on 401 errors
    onError: (error) => {
      // Handle 401 gracefully - user just needs to log in
      if (error.response?.status === 401) {
        console.log('Authentication required to check Google connection status');
      }
    }
  })

  const disconnectMutation = useMutation({
    mutationFn: () => googleAuthAPI.disconnect(),
    onSuccess: () => {
      toast.success('Google account disconnected')
      queryClient.invalidateQueries(['google-connection-status'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to disconnect')
    }
  })

  const handleConnectGoogle = async () => {
    try {
      setConnecting(true)
      
      // Get OAuth URL for email connection (user is already logged in)
      const redirectUri = `${window.location.origin}/api/auth/google/callback`
      const response = await googleAuthAPI.getAuthUrl(redirectUri)
      const { authUrl } = response.data.data

      // Open popup window (HubSpot-style)
      const width = 500
      const height = 600
      const left = (window.screen.width - width) / 2
      const top = (window.screen.height - height) / 2

      const popup = window.open(
        authUrl,
        'Google OAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      )

      // Listen for popup to close or receive message
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          setConnecting(false)
          // Refresh status
          queryClient.invalidateQueries(['google-connection-status'])
        }
      }, 500)

      // Listen for message from popup (if using postMessage)
      const messageListener = (event) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          clearInterval(checkClosed)
          popup.close()
          setConnecting(false)
          toast.success('Google account connected successfully')
          queryClient.invalidateQueries(['google-connection-status'])
          window.removeEventListener('message', messageListener)
        } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
          clearInterval(checkClosed)
          popup.close()
          setConnecting(false)
          toast.error(event.data.error || 'Failed to connect Google account')
          window.removeEventListener('message', messageListener)
        }
      }

      window.addEventListener('message', messageListener)
    } catch (error) {
      setConnecting(false)
      toast.error(error.response?.data?.message || 'Failed to initiate Google connection')
    }
  }

  // Check URL params for callback result
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleConnected = params.get('googleConnected')
    const error = params.get('error')

    if (googleConnected === 'true') {
      toast.success('Google account connected successfully')
      queryClient.invalidateQueries(['google-connection-status'])
      // Clean URL
      window.history.replaceState({}, '', '/settings')
    } else if (error) {
      toast.error(decodeURIComponent(error))
      // Clean URL
      window.history.replaceState({}, '', '/settings')
    }
  }, [queryClient])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account settings and integrations</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Email Integration</h2>
          
          {statusError?.response?.status === 401 ? (
            <div className="border-t border-gray-200 pt-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Authentication Required:</strong> Please log in to connect your Google account.
                </p>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">Google Account</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Connect your Google account to send Purchase Orders via Gmail
                  </p>
                  {googleStatus?.connected && (
                    <div className="mt-2 flex items-center text-sm text-green-600">
                      <CheckCircleIcon className="h-5 w-5 mr-1" />
                      Connected as {googleStatus.email}
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  {googleStatus?.connected ? (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to disconnect your Google account?')) {
                          disconnectMutation.mutate()
                        }
                      }}
                      disabled={disconnectMutation.isLoading}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      <XCircleIcon className="h-5 w-5 mr-2" />
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectGoogle}
                      disabled={connecting || (isLoading && !statusError)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <LinkIcon className="h-5 w-5 mr-2" />
                      {connecting ? 'Connecting...' : 'Connect Google'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {!googleStatus?.connected && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Why connect Google?</strong> Connecting your Google account allows you to send Purchase Orders 
                directly via Gmail without needing to configure SMTP settings. It's more secure and easier to use.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

