const queryParser = require('../services/ai/queryParser');
const responseGenerator = require('../services/ai/responseGenerator');
const analyticsEngine = require('../services/ai/analyticsEngine');
const dataAccess = require('../services/ai/dataAccess');
const { allTools } = require('../services/ai/tools/allTools');
const allToolHandlers = require('../services/ai/tools/toolHandlers');
const Job = require('../models/Job');
const mongoose = require('mongoose');

const aiController = {
  /**
   * Handle chat query
   */
  chat: async (req, res) => {
    try {
      const { message, context = {} } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }

      // Parse query
      const parsed = await queryParser.parseQuery(message, context);

      // Resolve job IDs (handle both ObjectIds and job numbers)
      const resolveJobId = async (jobIdentifier) => {
        if (!jobIdentifier) return null;
        
        // If it's already a valid ObjectId, return it
        if (mongoose.Types.ObjectId.isValid(jobIdentifier) && jobIdentifier.length === 24) {
          return jobIdentifier;
        }
        
        // Otherwise, try to find by jobNumber
        const job = await Job.findOne({ jobNumber: jobIdentifier }).select('_id').lean();
        return job?._id?.toString() || null;
      };

      // Resolve all job IDs in the parsed entities
      if (parsed.entities.jobIds && parsed.entities.jobIds.length > 0) {
        const resolvedIds = await Promise.all(
          parsed.entities.jobIds.map(id => resolveJobId(id))
        );
        parsed.entities.jobIds = resolvedIds.filter(id => id !== null);
      }

      // Detect general queries about available data (RAG-enabled)
      // Always fetch system data for RAG - it helps with all queries
      const lowerMessage = message.toLowerCase();
      const isGeneralQuery = lowerMessage.includes('what jobs') || 
                            lowerMessage.includes('what data') ||
                            lowerMessage.includes('what can you') ||
                            lowerMessage.includes('what do you') ||
                            lowerMessage.includes('show me all') ||
                            lowerMessage.includes('list all') ||
                            lowerMessage.includes('available jobs') ||
                            lowerMessage.includes('jobs can you') ||
                            lowerMessage.includes('hello') ||
                            lowerMessage.includes('hi') ||
                            (!parsed.entities.jobIds?.length && !context.currentJobId && 
                             (parsed.intent === 'analytics' || parsed.queryType === 'status'));

      // Always fetch system data for RAG - enables better responses
      let systemData = {};
      try {
        // Fetch all jobs summary for context (always, for RAG)
        const allJobs = await dataAccess.getAllJobsSummary();
        systemData.availableJobs = allJobs;
        systemData.totalJobs = allJobs.length;
        
        // Fetch projects for context
        const Project = require('../models/Project');
        const projects = await Project.find({})
          .select('name projectNumber totalContractValue')
          .lean()
          .limit(50);
        systemData.availableProjects = projects;
        systemData.totalProjects = projects.length;
        
        // Calculate summary stats
        const statusCounts = {};
        let totalValue = 0;
        allJobs.forEach(job => {
          statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
          totalValue += job.contractValue || 0;
        });
        systemData.statusBreakdown = statusCounts;
        systemData.totalContractValue = totalValue;
      } catch (error) {
        console.error('Error fetching system data for RAG:', error);
        systemData.error = error.message;
      }

      // Get data based on intent and query type
      let data = {};
      let responseText = '';

      if (parsed.intent === 'analytics') {
        if (parsed.queryType === 'status') {
          let jobId = parsed.entities.jobIds?.[0] || context.currentJobId;
          if (jobId && !mongoose.Types.ObjectId.isValid(jobId)) {
            jobId = await resolveJobId(jobId);
          }
          if (jobId) {
            data = await dataAccess.getJobMetrics(jobId);
            const evm = await analyticsEngine.calculateEVM(jobId);
            const health = await analyticsEngine.getJobHealthScore(jobId);
            data.evm = evm;
            data.health = health;
          } else {
            // Get all jobs summary (already fetched above for RAG)
            data = {
              jobs: systemData.availableJobs || [],
              projects: systemData.availableProjects || [],
              summary: {
                totalJobs: systemData.totalJobs || 0,
                totalProjects: systemData.totalProjects || 0,
                totalContractValue: systemData.totalContractValue || 0,
                statusBreakdown: systemData.statusBreakdown || {}
              }
            };
          }
        } else if (parsed.queryType === 'variance') {
          const jobId = parsed.entities.jobIds?.[0] || context.currentJobId;
          if (jobId) {
            data = await analyticsEngine.calculateVariance(jobId);
          }
        } else if (parsed.queryType === 'trend') {
          const jobId = parsed.entities.jobIds?.[0] || context.currentJobId;
          if (jobId) {
            data = await analyticsEngine.calculateTrends(jobId);
          }
        }
      } else if (parsed.intent === 'prediction') {
        let jobId = parsed.entities.jobIds?.[0] || context.currentJobId;
        if (jobId && !mongoose.Types.ObjectId.isValid(jobId)) {
          jobId = await resolveJobId(jobId);
        }
        if (jobId) {
          const metrics = await dataAccess.getJobMetrics(jobId);
          const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);
          const evm = await analyticsEngine.calculateEVM(jobId);
          
          // Simple forecast based on current trends
          const progress = metrics.metrics.taskProgress;
          const plannedEnd = scheduleAnalysis.plannedEnd;
          const now = new Date();
          const daysRemaining = plannedEnd 
            ? Math.ceil((plannedEnd - now) / (1000 * 60 * 60 * 24))
            : null;
          
          const forecastProgress = scheduleAnalysis.progressVariance < 0
            ? progress + (scheduleAnalysis.progressVariance * 0.5) // Adjust based on variance
            : progress;

          data = {
            forecast: {
              type: parsed.queryType === 'forecast' ? 'completion' : 'cost',
              predictedCompletionDate: plannedEnd && daysRemaining
                ? new Date(now.getTime() + (daysRemaining * 1.2) * 24 * 60 * 60 * 1000).toISOString()
                : null,
              predictedFinalCost: evm.estimateAtCompletion,
              confidence: 0.75,
              factors: {
                currentProgress: progress,
                progressVariance: scheduleAnalysis.progressVariance,
                costPerformanceIndex: evm.costPerformanceIndex
              }
            },
            confidence: 0.75
          };
        }
      } else if (parsed.intent === 'comparison') {
        let jobIds = parsed.entities.jobIds || [];
        // Resolve all job IDs
        if (jobIds.length > 0) {
          jobIds = await Promise.all(jobIds.map(id => resolveJobId(id)));
          jobIds = jobIds.filter(id => id !== null);
        }
        
        if (jobIds.length >= 2) {
          data = await analyticsEngine.compareJobs(jobIds);
        } else {
          // Compare current job with similar jobs
          const allJobs = await dataAccess.getAllJobsSummary();
          let currentJobId = context.currentJobId;
          if (currentJobId && !mongoose.Types.ObjectId.isValid(currentJobId)) {
            currentJobId = await resolveJobId(currentJobId);
          }
          if (currentJobId && allJobs.length > 1) {
            const similarJobs = allJobs
              .filter(j => j.id !== currentJobId)
              .slice(0, 2)
              .map(j => j.id);
            data = await analyticsEngine.compareJobs([currentJobId, ...similarJobs]);
          }
        }
      } else if (parsed.intent === 'action') {
        let jobId = parsed.entities.jobIds?.[0] || context.currentJobId;
        if (jobId && !mongoose.Types.ObjectId.isValid(jobId)) {
          jobId = await resolveJobId(jobId);
        }
        if (jobId) {
          const metrics = await dataAccess.getJobMetrics(jobId);
          const variance = await analyticsEngine.calculateVariance(jobId);
          const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);
          const health = await analyticsEngine.getJobHealthScore(jobId);

          // Generate recommendations
          const recommendations = [];
          
          if (variance.budgetVariance.percent < -5) {
            recommendations.push({
              priority: 'high',
              action: 'Review cost code performance and identify areas for cost reduction',
              reason: `Budget variance is ${variance.budgetVariance.percent.toFixed(1)}%`
            });
          }

          if (scheduleAnalysis.progressVariance < -10) {
            recommendations.push({
              priority: 'high',
              action: 'Accelerate work on critical path items',
              reason: `Progress is ${Math.abs(scheduleAnalysis.progressVariance).toFixed(1)}% behind schedule`
            });
          }

          if (scheduleAnalysis.overdueTasks > 0) {
            recommendations.push({
              priority: 'medium',
              action: `Address ${scheduleAnalysis.overdueTasks} overdue tasks`,
              reason: 'Overdue tasks may impact schedule'
            });
          }

          data = {
            recommendations,
            health,
            metrics,
            variance,
            scheduleAnalysis
          };
        }
      }

      // Merge context with request context (for settings)
      const enhancedContext = {
        ...context,
        systemPrompt: req.body.context?.systemPrompt,
        model: req.body.context?.model,
        maxTokens: req.body.context?.maxTokens,
        temperature: req.body.context?.temperature
      };

      // When tools are available, don't provide RAG data
      // This forces Claude to use tools for accurate, real-time data
      // RAG data may be outdated - tools fetch fresh data
      const ragData = jobTools.length > 0 
        ? {} // Empty - force tool usage
        : {
            ...data,
            systemData: systemData // Only use RAG if no tools available
          };

      // Use Claude's native function calling (tools) for dynamic tool usage
      // This gives us MCP-like benefits without the complexity
      console.log(`[AI Controller] 📋 Using tools: ${allTools.length} tools available`);
      console.log(`[AI Controller] 📝 Message: "${message.substring(0, 100)}"`);
      console.log(`[AI Controller] 🔧 Tools: ${allTools.slice(0, 10).map(t => t.name).join(', ')}... (${allTools.length} total)`);
      console.log(`[AI Controller] 📊 RAG data: ${Object.keys(ragData).length > 0 ? 'provided' : 'omitted (using tools instead)'}`);
      
      let response;
      try {
        response = await responseGenerator.generateResponseWithTools(
          message,
          ragData,
          enhancedContext,
          allTools,
          allToolHandlers
        );
        
        console.log(`[AI Controller] ✅ Response generated`);
        console.log(`[AI Controller] 🔧 Tool calls made: ${response.toolCallsUsed || 0}`);
        if (response.toolCallsMade && response.toolCallsMade.length > 0) {
          console.log(`[AI Controller] 🛠️  Tools used: ${response.toolCallsMade.map(t => t.name).join(', ')}`);
        }
      } catch (toolError) {
        console.error(`[AI Controller] ❌ Error in generateResponseWithTools:`, toolError);
        console.error(`[AI Controller] Stack:`, toolError.stack);
        // Fallback to regular response generation
        response = await responseGenerator.generateResponse(
          parsed.intent,
          parsed.queryType,
          ragData,
          enhancedContext
        );
        console.log(`[AI Controller] ⚠️  Fell back to regular response generation`);
      }

      res.json({
        success: true,
        response: response.response,
        data: response.data,
        visualizations: response.visualizations,
        toolCallsUsed: response.toolCallsUsed || 0,
        toolCallsMade: response.toolCallsMade || [],
        parsed: {
          intent: parsed.intent,
          queryType: parsed.queryType,
          entities: parsed.entities
        }
      });
    } catch (error) {
      console.error('Error in AI chat:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing AI query',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  /**
   * Get job analytics
   */
  getJobAnalytics: async (req, res) => {
    try {
      const { id } = req.params;

      const metrics = await dataAccess.getJobMetrics(id);
      const evm = await analyticsEngine.calculateEVM(id);
      const variance = await analyticsEngine.calculateVariance(id);
      const trends = await analyticsEngine.calculateTrends(id);
      const health = await analyticsEngine.getJobHealthScore(id);

      res.json({
        success: true,
        data: {
          metrics,
          evm,
          variance,
          trends,
          health
        }
      });
    } catch (error) {
      console.error('Error getting job analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  /**
   * Get job forecast
   */
  getJobForecast: async (req, res) => {
    try {
      const { id } = req.params;
      const { type = 'completion' } = req.query;

      const metrics = await dataAccess.getJobMetrics(id);
      const scheduleAnalysis = await dataAccess.getScheduleAnalysis(id);
      const evm = await analyticsEngine.calculateEVM(id);

      let forecast = {};
      if (type === 'completion') {
        const now = new Date();
        const plannedEnd = scheduleAnalysis.plannedEnd;
        const daysRemaining = plannedEnd 
          ? Math.ceil((plannedEnd - now) / (1000 * 60 * 60 * 24))
          : null;
        
        forecast = {
          type: 'completion',
          predictedCompletionDate: plannedEnd && daysRemaining
            ? new Date(now.getTime() + (daysRemaining * 1.2) * 24 * 60 * 60 * 1000).toISOString()
            : null,
          daysRemaining,
          confidence: 0.75,
          factors: {
            currentProgress: metrics.metrics.taskProgress,
            progressVariance: scheduleAnalysis.progressVariance,
            schedulePerformanceIndex: evm.schedulePerformanceIndex
          }
        };
      } else if (type === 'cost') {
        forecast = {
          type: 'cost',
          predictedFinalCost: evm.estimateAtCompletion,
          varianceAtCompletion: evm.varianceAtCompletion,
          confidence: 0.75,
          factors: {
            currentCost: metrics.metrics.totalCost,
            costPerformanceIndex: evm.costPerformanceIndex,
            budgetVariance: metrics.metrics.budgetVariancePercent
          }
        };
      }

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      console.error('Error getting forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating forecast',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  /**
   * Get available models from Anthropic API
   * Reference: https://platform.claude.com/docs/en/api/kotlin/beta/models
   */
  getAvailableModels: async (req, res) => {
    try {
      const https = require('https');
      const apiKey = process.env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }

      // Try to fetch models from Anthropic API using REST endpoint
      const modelsData = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.anthropic.com',
          path: '/v1/models?beta=true',
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        };

        const request = https.request(options, (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            try {
              if (response.statusCode === 200) {
                const parsed = JSON.parse(data);
                resolve(parsed);
              } else {
                reject(new Error(`API returned status ${response.statusCode}: ${data}`));
              }
            } catch (parseError) {
              reject(parseError);
            }
          });
        });

        request.on('error', (error) => {
          reject(error);
        });

        request.setTimeout(5000, () => {
          request.destroy();
          reject(new Error('Request timeout'));
        });

        request.end();
      });

      // Transform API response to our format
      const models = (modelsData.data || []).map(model => {
        const id = model.id || '';
        let category = 'other';
        let name = model.displayName || id;

        // Categorize models and format names nicely
        if (id.includes('sonnet')) {
          category = 'sonnet';
          // Format: claude-sonnet-4-5-20250929 -> Claude Sonnet 4.5
          const match = id.match(/claude-sonnet-(\d+)-(\d+)-(\d+)/);
          if (match) {
            const major = match[1];
            const minor = match[2];
            name = `Claude Sonnet ${major}.${minor}`;
            if (major === '4' && minor === '5') {
              name += ' (Latest)';
            }
          } else {
            name = name.replace('claude-sonnet', 'Claude Sonnet').replace(/-/g, ' ');
          }
        } else if (id.includes('opus')) {
          category = 'opus';
          const match = id.match(/claude-opus-(\d+)-(\d+)-(\d+)/);
          if (match) {
            const major = match[1];
            const minor = match[2];
            name = `Claude Opus ${major}.${minor}`;
          } else {
            name = name.replace('claude-opus', 'Claude Opus').replace(/-/g, ' ');
          }
        } else if (id.includes('haiku')) {
          category = 'haiku';
          const match = id.match(/claude-haiku-(\d+)-(\d+)-(\d+)/);
          if (match) {
            const major = match[1];
            const minor = match[2];
            name = `Claude Haiku ${major}.${minor}`;
          } else {
            name = name.replace('claude-haiku', 'Claude Haiku').replace(/-/g, ' ');
          }
        }

        return {
          id: id,
          name: name,
          category: category,
          available: true,
          createdAt: model.createdAt
        };
      });

      // Sort by creation date (newest first)
      models.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Find latest Sonnet as recommended (prefer 4.5, then latest)
      const sonnet45 = models.find(m => m.category === 'sonnet' && m.id.includes('sonnet-4-5'));
      const latestSonnet = sonnet45 || models.find(m => m.category === 'sonnet') || models[0];

      return res.json({
        success: true,
        data: {
          models: models,
          default: latestSonnet?.id || 'claude-sonnet-4-5-20250929',
          recommended: latestSonnet?.id || 'claude-sonnet-4-5-20250929'
        }
      });

    } catch (error) {
      console.log('Using fallback model list (API fetch failed):', error.message);
      
      // Comprehensive fallback list with all known models
      const knownModels = [
        { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Latest)', category: 'sonnet' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', category: 'sonnet' },
        { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (June)', category: 'sonnet' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', category: 'opus' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', category: 'sonnet' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', category: 'haiku' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', category: 'haiku' },
        { id: 'claude-3-5-haiku-20240620', name: 'Claude 3.5 Haiku (June)', category: 'haiku' },
      ];

      const availableModels = knownModels.map(model => ({
        id: model.id,
        name: model.name,
        category: model.category,
        available: true
      }));

      return res.json({
        success: true,
        data: {
          models: availableModels,
          default: 'claude-3-5-sonnet-20241022',
          recommended: 'claude-3-7-sonnet-20250219'
        }
      });
    }
  }
};

module.exports = aiController;

