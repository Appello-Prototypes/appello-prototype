import React, { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, aiAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  CpuChipIcon,
  PaperAirplaneIcon,
  BookmarkIcon,
  TrashIcon,
  PlayIcon,
  PlusIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid'

const AITestingDashboard = () => {
  const [prompts, setPrompts] = useState([])
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [selectedPromptId, setSelectedPromptId] = useState(null)
  const [responses, setResponses] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [jobId, setJobId] = useState('')
  const [jobs, setJobs] = useState([])

  // Load saved prompts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai_test_prompts')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPrompts(parsed)
      } catch (e) {
        console.error('Error loading saved prompts:', e)
      }
    }
  }, [])

  // Load jobs for context
  useEffect(() => {
    api.get('/api/jobs')
      .then(res => {
        if (res.data.success) {
          setJobs(res.data.data || [])
        }
      })
      .catch(err => console.error('Error loading jobs:', err))
  }, [])

  const savePrompt = () => {
    if (!currentPrompt.trim()) {
      toast.error('Please enter a prompt to save')
      return
    }

    const newPrompt = {
      id: Date.now().toString(),
      text: currentPrompt.trim(),
      jobId: jobId || null,
      createdAt: new Date().toISOString(),
      lastRun: null,
      runCount: 0
    }

    const updated = [...prompts, newPrompt]
    setPrompts(updated)
    localStorage.setItem('ai_test_prompts', JSON.stringify(updated))
    toast.success('Prompt saved!')
    setSelectedPromptId(newPrompt.id)
  }

  const deletePrompt = (id) => {
    const updated = prompts.filter(p => p.id !== id)
    setPrompts(updated)
    localStorage.setItem('ai_test_prompts', JSON.stringify(updated))
    if (selectedPromptId === id) {
      setSelectedPromptId(null)
      setCurrentPrompt('')
      setJobId('')
    }
    toast.success('Prompt deleted')
  }

  const loadPrompt = (prompt) => {
    setCurrentPrompt(prompt.text)
    setJobId(prompt.jobId || '')
    setSelectedPromptId(prompt.id)
  }

  const chatMutation = useMutation({
    mutationFn: async (message) => {
      const response = await aiAPI.chat(message, {
        currentJobId: jobId || undefined
      })
      return response.data
    },
    onSuccess: (data) => {
      const responseItem = {
        id: Date.now().toString(),
        prompt: currentPrompt,
        response: data.response,
        data: data.data,
        timestamp: new Date().toISOString(),
        jobId: jobId || null
      }
      setResponses(prev => [responseItem, ...prev])

      // Update prompt run count
      if (selectedPromptId) {
        const updated = prompts.map(p => 
          p.id === selectedPromptId 
            ? { ...p, lastRun: new Date().toISOString(), runCount: (p.runCount || 0) + 1 }
            : p
        )
        setPrompts(updated)
        localStorage.setItem('ai_test_prompts', JSON.stringify(updated))
      }

      setIsLoading(false)
      toast.success('Response received!')
    },
    onError: (error) => {
      console.error('AI chat error:', error)
      toast.error(error.response?.data?.message || 'Failed to get AI response')
      setIsLoading(false)
    }
  })

  const runPrompt = () => {
    if (!currentPrompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsLoading(true)
    chatMutation.mutate(currentPrompt)
  }

  const runSavedPrompt = (prompt) => {
    loadPrompt(prompt)
    setTimeout(() => {
      setIsLoading(true)
      chatMutation.mutate(prompt.text)
    }, 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <CpuChipIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Testing Dashboard</h1>
            <p className="text-sm text-gray-500">Test, save, and rerun AI prompts</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Saved Prompts */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Saved Prompts</h2>
              <span className="text-sm text-gray-500">{prompts.length}</span>
            </div>
            
            {prompts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookmarkIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No saved prompts yet</p>
                <p className="text-xs mt-1">Save prompts to rerun them easily</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPromptId === prompt.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => loadPrompt(prompt)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {prompt.text.substring(0, 60)}
                          {prompt.text.length > 60 && '...'}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {prompt.runCount > 0 && (
                            <span className="flex items-center gap-1">
                              <PlayIcon className="w-3 h-3" />
                              {prompt.runCount}x
                            </span>
                          )}
                          {prompt.lastRun && (
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              {new Date(prompt.lastRun).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            runSavedPrompt(prompt)
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Run prompt"
                        >
                          <PlayIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePrompt(prompt.id)
                          }}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Delete prompt"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Prompt Input & Responses */}
        <div className="lg:col-span-2 space-y-4">
          {/* Prompt Input */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Prompt</h2>
            
            {/* Job Context */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Context (Optional)
              </label>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No specific job</option>
                {jobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.jobNumber} - {job.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt Textarea */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt
              </label>
              <textarea
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                placeholder="Enter your test prompt here... e.g., 'What's the status of job JOB-2025-ELEC-001?'"
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={runPrompt}
                disabled={!currentPrompt.trim() || isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    <span>Run Prompt</span>
                  </>
                )}
              </button>
              <button
                onClick={savePrompt}
                disabled={!currentPrompt.trim()}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 font-medium transition-colors flex items-center gap-2"
              >
                <BookmarkIcon className="w-5 h-5" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Responses */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Responses</h2>
            
            {responses.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CpuChipIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No responses yet</p>
                <p className="text-xs mt-1">Run a prompt to see AI responses</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {responses.map((response) => (
                  <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Prompt
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(response.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mb-3">
                          {response.prompt}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <CpuChipIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-500 mb-2">AI Response</div>
                        <div className="text-sm text-gray-900 whitespace-pre-wrap bg-blue-50 p-3 rounded">
                          {response.response}
                        </div>
                        {response.data && (
                          <details className="mt-3">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              View Raw Data
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48">
                              {JSON.stringify(response.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AITestingDashboard

