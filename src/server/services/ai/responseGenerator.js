const Anthropic = require('@anthropic-ai/sdk');
const analyticsEngine = require('./analyticsEngine');
const dataAccess = require('./dataAccess');
const { allTools } = require('./tools/allTools');
const allToolHandlers = require('./tools/toolHandlers');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Get AI settings (with defaults)
const getAISettings = () => {
  // In a real app, this would come from a database or user preferences
  // For now, we'll use defaults that can be overridden
  return {
    model: 'claude-sonnet-4-5-20250929', // Claude Sonnet 4.5 by default
    maxTokens: 2000,
    temperature: 0.7,
    systemPrompt: `You are an AI assistant for a construction job management system. You help project managers, estimators, and field supervisors understand their job data.

CRITICAL: You have access to real job data through:
1. **Function Calling Tools**: You can call tools like list_jobs, get_job, get_job_metrics, etc. to fetch real data
2. **RAG Context**: Pre-fetched data may be provided in context

**When to use tools:**
- When user asks "what jobs can you access?" → Call list_jobs()
- When user asks about a specific job → Call get_job() or get_job_metrics()
- When user wants forecasts → Call get_job_forecast()
- When user wants recommendations → Call get_job_recommendations()
- When user wants to compare jobs → Call compare_jobs()

**Always use tools to get accurate, real-time data. Don't make up or guess job information.**

Your responses should be:
- Clear and concise
- Actionable when appropriate
- Include specific numbers and metrics from actual tool results
- Use emojis sparingly for visual clarity (🚨 for urgent, ✅ for good, ⚠️ for warnings)
- Format lists and metrics clearly
- Suggest next steps when relevant
- Reference actual job numbers, names, and data from tool results

When presenting data:
- Always include actual numbers, not just percentages
- Use real job numbers and names from tool results
- Compare to budgets/plans when relevant
- Highlight critical issues first
- Provide context for numbers

Be conversational but professional. Always use tools to get accurate data before responding.`,
    conversationHistoryLength: 10,
    enableVisualizations: true,
    responseStyle: 'professional',
    detailLevel: 'medium'
  };
};

class ResponseGenerator {
  /**
   * Generate natural language response from data
   */
  async generateResponse(intent, queryType, data, context = {}) {
    try {
      // Get AI settings (merge defaults with context overrides)
      const defaultSettings = getAISettings();
      const settings = {
        model: context.model || defaultSettings.model,
        maxTokens: context.maxTokens || defaultSettings.maxTokens,
        temperature: context.temperature !== undefined ? context.temperature : defaultSettings.temperature,
        systemPrompt: context.systemPrompt || defaultSettings.systemPrompt,
        conversationHistoryLength: context.conversationHistoryLength || defaultSettings.conversationHistoryLength,
        enableVisualizations: context.enableVisualizations !== undefined ? context.enableVisualizations : defaultSettings.enableVisualizations,
        responseStyle: context.responseStyle || defaultSettings.responseStyle,
        detailLevel: context.detailLevel || defaultSettings.detailLevel
      };
      
      // Format data for LLM
      const formattedData = await this.formatDataForLLM(intent, queryType, data);

      // Use custom system prompt if provided, otherwise use default
      const systemPrompt = settings.systemPrompt;

      // Build conversation context from history
      let conversationContext = '';
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        conversationContext = '\n\nConversation History:\n' + 
          context.conversationHistory
            .slice(-5) // Last 5 messages for context
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');
      }

      // Include system data (RAG context) in the prompt
      let ragContext = '';
      if (data.systemData) {
        const jobs = data.systemData.availableJobs || [];
        const projects = data.systemData.availableProjects || [];
        
        const statusBreakdown = data.systemData.statusBreakdown || {};
        const totalValue = data.systemData.totalContractValue || 0;
        
        ragContext = `\n\n=== AVAILABLE SYSTEM DATA (RAG Context) ===
SYSTEM OVERVIEW:
- Total Jobs: ${data.systemData.totalJobs || 0}
- Total Projects: ${data.systemData.totalProjects || 0}
- Total Contract Value: $${totalValue.toLocaleString()}
- Status Breakdown: ${Object.entries(statusBreakdown).map(([status, count]) => `${status}: ${count}`).join(', ') || 'N/A'}

${jobs.length > 0 ? `AVAILABLE JOBS (${jobs.length} total):
${jobs.slice(0, 30).map((job, idx) => 
  `${idx + 1}. ${job.jobNumber || 'N/A'}: "${job.name || 'Unnamed'}" 
     - Status: ${job.status || 'unknown'}
     - Progress: ${(job.progress || 0).toFixed(1)}%
     - Contract Value: $${(job.contractValue || 0).toLocaleString()}
     - Manager: ${job.jobManager?.name || 'Unassigned'}
     - Project: ${job.project?.projectNumber || job.project?.name || 'N/A'}
     - Client: ${job.client || 'N/A'}`
).join('\n\n')}
${jobs.length > 30 ? `\n... and ${jobs.length - 30} more jobs (total: ${jobs.length})` : ''}
` : 'No jobs found in system.'}

${projects.length > 0 ? `\nAVAILABLE PROJECTS (${projects.length} total):
${projects.slice(0, 15).map((proj, idx) => 
  `${idx + 1}. ${proj.projectNumber || 'N/A'}: "${proj.name || 'Unnamed'}" (Value: $${(proj.totalContractValue || 0).toLocaleString()})`
).join('\n')}
${projects.length > 15 ? `\n... and ${projects.length - 15} more projects` : ''}
` : ''}

=== END RAG CONTEXT ===

IMPORTANT: When users ask about available jobs or data, use the information above. Reference specific job numbers and names.`;
      }

      const userMessage = `Generate a response for this ${intent} query about ${queryType}.

Query Context:
${JSON.stringify(formattedData, null, 2)}
${ragContext}
${conversationContext}

IMPORTANT: Use the RAG context above to answer questions about available jobs/data. When asked "what jobs can you access?", list the actual jobs from the system data. Be specific and use actual job numbers and names from the data.`;

      // Build messages array with conversation history
      const messages = [];
      
      // Add conversation history if available
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        const historyToInclude = context.conversationHistory.slice(-settings.conversationHistoryLength);
        historyToInclude.forEach(msg => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            });
          }
        });
      }
      
      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      const response = await anthropic.messages.create({
        model: settings.model,
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
        system: systemPrompt,
        messages: messages
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return {
          response: content.text,
          data: {
            ...formattedData,
            systemData: data.systemData // Include RAG data in response
          },
          visualizations: this.generateVisualizations(intent, queryType, data)
        };
      }

      return {
        response: 'I apologize, but I encountered an error generating the response.',
        data: formattedData
      };
    } catch (error) {
      console.error('Error generating response:', error);
      return {
        response: this.generateFallbackResponse(intent, queryType, data),
        data
      };
    }
  }

  /**
   * Generate response using Claude's native function calling (tools)
   * This provides MCP-like capabilities without requiring a separate MCP server
   */
  async generateResponseWithTools(message, data, context = {}, tools = null, toolHandlers = null) {
    // Use allTools by default if not provided
    const toolsToUse = tools || allTools;
    const handlersToUse = toolHandlers || allToolHandlers;
    try {
      const settings = getAISettings();
      let systemPrompt = context.systemPrompt || settings.systemPrompt;
      
      // Enhance system prompt to encourage tool usage
      if (toolsToUse.length > 0) {
        systemPrompt = `You are an AI assistant for a construction job management system. You help project managers, estimators, and field supervisors understand their job data.

CRITICAL: You have access to ${tools.length} tools. You MUST use these tools to get accurate, real-time data. DO NOT make up or guess data.

AVAILABLE TOOLS:
${toolsToUse.map(t => `- ${t.name}: ${t.description}`).join('\n')}

WHEN TO USE TOOLS:
- "what jobs can you access?" → ALWAYS call list_jobs() tool
- "show me all jobs" → ALWAYS call list_jobs() tool  
- About a specific job → Call get_job() or get_job_metrics() tool
- For forecasts → Call get_job_forecast() tool
- For recommendations → Call get_job_recommendations() tool
- "at risk", "most at risk", "problematic", "troubled" → Call find_at_risk_jobs() tool
- Risk analysis → Call analyze_job_risk() or find_at_risk_jobs() tool

RULES:
1. ALWAYS call tools to get data - never make up job information
2. Use the tool results to answer questions accurately
3. Reference actual job numbers and names from tool results
4. Be conversational but accurate

Your responses should be clear, include specific numbers, and reference actual data from tool results.`;
      }

      // Build conversation history
      const messages = [];
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        const historyToInclude = context.conversationHistory.slice(-settings.conversationHistoryLength);
        historyToInclude.forEach(msg => {
          // Handle both string and array content formats
          let content = msg.content;
          if (typeof content === 'string') {
            content = content;
          } else if (Array.isArray(content)) {
            content = content;
          }
          
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: content
            });
          }
        });
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: message
      });

      // Convert tools to Claude's format
      const claudeTools = toolsToUse.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema
      }));
      
      console.log(`[AI Tools] Making request with ${claudeTools.length} tools available`);
      
      // Debug: Log first tool to verify format
      if (claudeTools.length > 0) {
        console.log(`[AI Tools] First tool: ${claudeTools[0].name} - ${claudeTools[0].description.substring(0, 60)}...`);
      }

      // Make initial request with tools
      // IMPORTANT: Only pass tools if we have them and they're valid
      const toolsParam = claudeTools.length > 0 ? claudeTools : undefined;
      
      console.log(`[AI Tools] Request config: model=${settings.model}, tools=${toolsParam ? toolsParam.length : 0}`);
      
      let response = await anthropic.messages.create({
        model: settings.model,
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
        system: systemPrompt,
        messages: messages,
        tools: toolsParam
      });
      
      console.log(`[AI Tools] Response received: ${response.content.length} content items`);
      response.content.forEach((item, idx) => {
        console.log(`[AI Tools] Content ${idx + 1}: type=${item.type}${item.type === 'tool_use' ? `, tool=${item.name}` : ''}`);
      });

      // Handle tool calls in a loop (Claude may call multiple tools)
      const maxToolCalls = 5; // Prevent infinite loops
      let toolCallCount = 0;
      let finalResponse = null;
      const toolCallsMade = [];

      while (toolCallCount < maxToolCalls) {
        // Check all content items for tool_use
        const toolUses = response.content.filter(item => item.type === 'tool_use');
        const textContent = response.content.find(item => item.type === 'text');
        
        console.log(`[AI Tools] Loop iteration ${toolCallCount + 1}:`);
        console.log(`[AI Tools]   - Response content items: ${response.content.length}`);
        console.log(`[AI Tools]   - Tool uses found: ${toolUses.length}`);
        console.log(`[AI Tools]   - Text content: ${textContent ? 'yes' : 'no'}`);
        
        if (textContent && toolUses.length === 0) {
          // Got final text response, no more tools needed
          console.log(`[AI Tools] ✅ Got final text response, no more tools needed`);
          finalResponse = textContent.text;
          break;
        }
        
        if (toolUses.length > 0) {
          console.log(`[AI Tools] 🔧 Processing ${toolUses.length} tool call(s)`);
          // Process all tool calls
          const toolResults = [];
          
          for (const toolCall of toolUses) {
            toolCallCount++;
            toolCallsMade.push({ name: toolCall.name, input: toolCall.input });
            console.log(`[AI Tools] 🔧 Executing tool: ${toolCall.name}`, JSON.stringify(toolCall.input));

            // Execute the tool
            if (handlersToUse[toolCall.name]) {
              try {
                const toolResult = await handlersToUse[toolCall.name](toolCall.input);
                const resultStr = JSON.stringify(toolResult);
                console.log(`[AI Tools] ✅ Tool ${toolCall.name} succeeded (result length: ${resultStr.length})`);
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: toolCall.id,
                  content: resultStr
                });
              } catch (toolError) {
                console.error(`[AI Tools] ❌ Error executing tool ${toolCall.name}:`, toolError.message);
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: toolCall.id,
                  content: JSON.stringify({ 
                    success: false,
                    error: toolError.message 
                  })
                });
              }
            } else {
              console.error(`[AI Tools] ⚠️  Unknown tool: ${toolCall.name}`);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolCall.id,
                content: JSON.stringify({ 
                  success: false,
                  error: `Unknown tool: ${toolCall.name}` 
                })
              });
            }
          }

          // Add assistant's tool use to conversation
          messages.push({
            role: 'assistant',
            content: response.content
          });

          // Add tool results
          messages.push({
            role: 'user',
            content: toolResults
          });

          // Continue conversation with tool results
          console.log(`[AI Tools] 📤 Sending tool results back to Claude (${toolResults.length} results)`);
          response = await anthropic.messages.create({
            model: settings.model,
            max_tokens: settings.maxTokens,
            temperature: settings.temperature,
            system: systemPrompt,
            messages: messages,
            tools: claudeTools.length > 0 ? claudeTools : undefined
          });
          
          console.log(`[AI Tools] 📥 Got response after tool execution: ${response.content.length} items`);
          response.content.forEach((item, idx) => {
            console.log(`[AI Tools]   Item ${idx + 1}: type=${item.type}${item.type === 'tool_use' ? `, tool=${item.name}` : ''}`);
          });
        } else {
          // No tool calls and no text - unexpected state
          console.warn('[AI Tools] ⚠️  Unexpected response format - no tools, no text');
          console.warn('[AI Tools] Response content:', JSON.stringify(response.content, null, 2));
          break;
        }
      }

      // Get final response text
      if (!finalResponse) {
        const textContent = response.content.find(item => item.type === 'text');
        if (textContent) {
          finalResponse = textContent.text;
        } else {
          console.warn('[AI Tools] ⚠️  No text content found in final response');
          finalResponse = 'I encountered an issue processing your request.';
        }
      }

      console.log(`[AI Tools] 📊 Final summary:`);
      console.log(`[AI Tools]   - Tool calls made: ${toolCallCount}`);
      console.log(`[AI Tools]   - Tools used: ${toolCallsMade.map(t => t.name).join(', ') || 'none'}`);
      console.log(`[AI Tools]   - Response length: ${finalResponse.length}`);

      return {
        response: finalResponse || 'I encountered an issue processing your request.',
        data: data,
        visualizations: this.generateVisualizations('analytics', 'status', data),
        toolCallsUsed: toolCallCount,
        toolCallsMade: toolCallsMade
      };
    } catch (error) {
      console.error('Error generating response with tools:', error);
      // Fallback to regular response generation
      return await this.generateResponse('analytics', 'status', data, context);
    }
  }

  /**
   * Format data for LLM consumption
   */
  async formatDataForLLM(intent, queryType, data) {
    if (intent === 'analytics') {
      if (queryType === 'status') {
        // If we have jobs list (general query), return that
        if (data.jobs && Array.isArray(data.jobs)) {
          return {
            jobs: data.jobs,
            summary: data.summary || {},
            projects: data.projects || []
          };
        }
        // Otherwise, single job data
        return {
          job: {
            name: data.job?.name,
            jobNumber: data.job?.jobNumber,
            status: data.job?.status,
            progress: data.metrics?.taskProgress,
            contractValue: data.job?.contractValue
          },
          metrics: {
            budgetVariance: data.metrics?.budgetVariancePercent,
            totalCost: data.metrics?.totalCost,
            totalHours: data.metrics?.totalHours,
            scheduleVariance: data.scheduleAnalysis?.progressVariance
          }
        };
      } else if (queryType === 'variance') {
        return {
          budgetVariance: data.budgetVariance,
          scheduleVariance: data.scheduleVariance,
          criticalVariances: data.costCodeVariances?.slice(0, 5)
        };
      }
    } else if (intent === 'prediction') {
      return {
        forecast: data.forecast,
        confidence: data.confidence,
        factors: data.factors
      };
    } else if (intent === 'comparison') {
      return {
        jobs: data.jobs,
        averages: data.averages,
        bestPerformer: data.bestPerformer,
        worstPerformer: data.worstPerformer
      };
    }

    return data;
  }

  /**
   * Generate visualization suggestions
   */
  generateVisualizations(intent, queryType, data) {
    const visualizations = [];

    if (intent === 'analytics') {
      if (queryType === 'variance') {
        visualizations.push({
          type: 'chart',
          chartType: 'bar',
          title: 'Budget Variance by Cost Code',
          data: data.costCodeVariances?.slice(0, 10) || []
        });
      } else if (queryType === 'trend') {
        visualizations.push({
          type: 'chart',
          chartType: 'line',
          title: 'Hours Trend Over Time',
          data: data.trendData || []
        });
      }
    } else if (intent === 'prediction') {
      visualizations.push({
        type: 'metric',
        title: 'Forecast',
        value: data.forecast?.value,
        unit: data.forecast?.unit
      });
    }

    return visualizations;
  }

  /**
   * Fallback response generation
   */
  generateFallbackResponse(intent, queryType, data) {
    if (intent === 'analytics' && queryType === 'status') {
      const job = data.job;
      const metrics = data.metrics;
      return `Job ${job?.jobNumber || 'N/A'}: ${job?.name || 'Unknown'}

Status: ${job?.status || 'Unknown'}
Progress: ${metrics?.taskProgress?.toFixed(1) || 0}%
Contract Value: $${job?.contractValue?.toLocaleString() || 0}
Budget Variance: ${metrics?.budgetVariancePercent?.toFixed(1) || 0}%
Total Hours: ${metrics?.totalHours?.toFixed(1) || 0}
Total Cost: $${metrics?.totalCost?.toLocaleString() || 0}`;
    }

    return JSON.stringify(data, null, 2);
  }
}

module.exports = new ResponseGenerator();

