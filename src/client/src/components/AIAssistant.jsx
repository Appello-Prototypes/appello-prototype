import React, { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import { 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon,
  XMarkIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'

const AIAssistant = ({ jobId, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you analyze job data, answer questions about performance, make predictions, and provide recommendations. What would you like to know?'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const chatMutation = useMutation({
    mutationFn: async (message) => {
      // Load AI settings
      const aiSettings = JSON.parse(localStorage.getItem('ai_settings') || '{}')
      const historyLength = aiSettings.conversationHistoryLength || 10
      
      // Build conversation history
      const conversationHistory = messages
        .slice(-historyLength)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      const response = await api.post('/api/ai/chat', {
        message,
        context: {
          currentJobId: jobId,
          conversationHistory: conversationHistory,
          systemPrompt: aiSettings.systemPrompt,
          model: aiSettings.model,
          maxTokens: aiSettings.maxTokens,
          temperature: aiSettings.temperature
        }
      })
      return response.data
    },
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          data: data.data,
          visualizations: data.visualizations
        }
      ])
      setIsLoading(false)
    },
    onError: (error) => {
      console.error('AI chat error:', error)
      toast.error('Failed to get AI response. Please try again.')
      setIsLoading(false)
    }
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    // Send to API
    chatMutation.mutate(userMessage)
  }

  const suggestedQueries = [
    "What's the current status of this job?",
    "Show me budget variance",
    "When will this job be complete?",
    "What should I focus on?",
    "Compare this job with others"
  ]

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 ${className}`}
          aria-label="Open AI Assistant"
        >
          <ChatBubbleLeftRightIcon className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col ${className}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CpuChipIcon className="w-5 h-5" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Close AI Assistant"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  {message.visualizations && message.visualizations.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {message.visualizations.length} visualization(s) available
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Queries */}
          {messages.length === 1 && (
            <div className="px-4 pb-2">
              <div className="text-xs text-gray-500 mb-2">Try asking:</div>
              <div className="flex flex-wrap gap-2">
                {suggestedQueries.slice(0, 3).map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(query)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your jobs..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

export default AIAssistant

