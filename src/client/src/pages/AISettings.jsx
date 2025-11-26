import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api, aiAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  CpuChipIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

const AISettings = () => {
  const [settings, setSettings] = useState({
    model: 'claude-sonnet-4-5-20250929', // Default to Claude Sonnet 4.5
    maxTokens: 2000,
    temperature: 0.7,
    systemPrompt: `You are an AI assistant for a construction job management system. You help project managers, estimators, and field supervisors understand their job data.

Your responses should be:
- Clear and concise
- Actionable when appropriate
- Include specific numbers and metrics
- Use emojis sparingly for visual clarity (🚨 for urgent, ✅ for good, ⚠️ for warnings)
- Format lists and metrics clearly
- Suggest next steps when relevant

When presenting data:
- Always include actual numbers, not just percentages
- Compare to budgets/plans when relevant
- Highlight critical issues first
- Provide context for numbers

Be conversational but professional.`,
    conversationHistoryLength: 10,
    enableVisualizations: true,
    responseStyle: 'professional',
    detailLevel: 'medium'
  })

  const [hasChanges, setHasChanges] = useState(false)
  const [availableModels, setAvailableModels] = useState([])

  // Fetch available models
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => aiAPI.getAvailableModels().then(res => res.data),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai_settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error('Error loading AI settings:', e)
      }
    }
  }, [])

  // Update available models when fetched
  useEffect(() => {
    if (modelsData?.success && modelsData?.data?.models) {
      setAvailableModels(modelsData.data.models)
      // If current model is not in the list, update to recommended/default
      const currentModelExists = modelsData.data.models.some(m => m.id === settings.model)
      if (!currentModelExists && modelsData.data.recommended) {
        setSettings(prev => ({ ...prev, model: modelsData.data.recommended }))
        setHasChanges(true)
      }
    }
  }, [modelsData])

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem('ai_settings', JSON.stringify(settings))
    setHasChanges(false)
    toast.success('AI settings saved!')
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const resetToDefaults = () => {
    const recommendedModel = modelsData?.data?.recommended || 'claude-3-7-sonnet-20250219'
    const defaults = {
      model: recommendedModel,
      maxTokens: 2000,
      temperature: 0.7,
      systemPrompt: `You are an AI assistant for a construction job management system. You help project managers, estimators, and field supervisors understand their job data.

Your responses should be:
- Clear and concise
- Actionable when appropriate
- Include specific numbers and metrics
- Use emojis sparingly for visual clarity (🚨 for urgent, ✅ for good, ⚠️ for warnings)
- Format lists and metrics clearly
- Suggest next steps when relevant

When presenting data:
- Always include actual numbers, not just percentages
- Compare to budgets/plans when relevant
- Highlight critical issues first
- Provide context for numbers

Be conversational but professional.`,
      conversationHistoryLength: 10,
      enableVisualizations: true,
      responseStyle: 'professional',
      detailLevel: 'medium'
    }
    setSettings(defaults)
    setHasChanges(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-2">
          <Cog6ToothIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Assistant Settings</h1>
            <p className="text-sm text-gray-500">Configure and tune your AI assistant behavior</p>
          </div>
        </div>
        {hasChanges && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            <InformationCircleIcon className="w-5 h-5" />
            <span>You have unsaved changes</span>
          </div>
        )}
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Model Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Model Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
                {modelsLoading && (
                  <span className="ml-2 text-xs text-gray-400">Loading models...</span>
                )}
              </label>
              {modelsLoading ? (
                <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-500">Loading available models...</span>
                </div>
              ) : (
                <>
                  <select
                    value={settings.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableModels.length > 0 ? (
                      <>
                        {/* Group by category - Sonnet first, then Opus, then Haiku */}
                        {['sonnet', 'opus', 'haiku'].map(category => {
                          const categoryModels = availableModels.filter(m => m.category === category)
                          if (categoryModels.length === 0) return null
                          return (
                            <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                              {categoryModels.map(model => (
                                <option key={model.id} value={model.id}>
                                  {model.name}
                                  {model.id === modelsData?.data?.recommended && ' ⭐ (Recommended)'}
                                  {model.id === modelsData?.data?.default && ' (Default)'}
                                </option>
                              ))}
                            </optgroup>
                          )
                        })}
                      </>
                    ) : (
                      <>
                        <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 ⭐ (Latest)</option>
                        <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</option>
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                        <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fastest)</option>
                      </>
                    )}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {availableModels.length > 0 
                      ? `${availableModels.length} models available. Claude Sonnet 4.5 is recommended for best performance.`
                      : 'Claude Sonnet 4.5 offers the latest features and best performance'}
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tokens: {settings.maxTokens}
              </label>
              <input
                type="range"
                min="500"
                max="4000"
                step="100"
                value={settings.maxTokens}
                onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>500 (Short)</span>
                <span>4000 (Long)</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Maximum length of AI responses. Higher values allow more detailed responses.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature: {settings.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.0 (Focused)</span>
                <span>1.0 (Creative)</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Controls randomness. Lower values make responses more focused and deterministic.
              </p>
            </div>
          </div>
        </div>

        {/* Conversation Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversation History Length: {settings.conversationHistoryLength} messages
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={settings.conversationHistoryLength}
                onChange={(e) => handleChange('conversationHistoryLength', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 (No context)</span>
                <span>20 (Full context)</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Number of previous messages to include for context. Higher values improve conversation continuity.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Response Style
              </label>
              <select
                value={settings.responseStyle}
                onChange={(e) => handleChange('responseStyle', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="technical">Technical</option>
                <option value="concise">Concise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detail Level
              </label>
              <select
                value={settings.detailLevel}
                onChange={(e) => handleChange('detailLevel', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="minimal">Minimal</option>
                <option value="medium">Medium</option>
                <option value="detailed">Detailed</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableVisualizations"
                checked={settings.enableVisualizations}
                onChange={(e) => handleChange('enableVisualizations', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enableVisualizations" className="ml-2 block text-sm text-gray-700">
                Enable visualizations in responses
              </label>
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Prompt</h2>
          <p className="text-sm text-gray-500 mb-4">
            Customize the AI's behavior and personality. This prompt guides how the AI responds to all queries.
          </p>
          
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => handleChange('systemPrompt', e.target.value)}
            rows={15}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="Enter system prompt..."
          />
          
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <InformationCircleIcon className="w-4 h-4" />
            <span>Changes to the system prompt take effect immediately after saving</span>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset to Defaults
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSettings(JSON.parse(localStorage.getItem('ai_settings') || '{}'))
                  setHasChanges(false)
                }}
                disabled={!hasChanges}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={!hasChanges}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircleIcon className="w-5 h-5" />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AISettings

