import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')
    
    if (token) {
      // Store token
      localStorage.setItem('authToken', token)
      
      // Notify parent window if opened in popup
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            token: token
          }, window.location.origin)
          window.close()
        } catch (err) {
          console.error('Error posting message:', err)
          // Fallback: redirect in same window
          toast.success('Login successful!')
          navigate('/dashboard')
        }
      } else {
        toast.success('Login successful!')
        navigate('/dashboard')
      }
    } else if (error) {
      const errorMessage = decodeURIComponent(error)
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: errorMessage
          }, window.location.origin)
          window.close()
        } catch (err) {
          console.error('Error posting message:', err)
          // Fallback: redirect in same window
          toast.error(errorMessage)
          navigate('/login')
        }
      } else {
        toast.error(errorMessage)
        navigate('/login')
      }
    } else {
      // No token and no error - might be loading
      setTimeout(() => {
        if (!token && !error) {
          toast.error('Authentication timeout')
          navigate('/login')
        }
      }, 5000)
    }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  )
}

