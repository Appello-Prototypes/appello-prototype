const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

class QueryParser {
  /**
   * Parse user query to extract intent and entities
   */
  async parseQuery(query, context = {}) {
    try {
      const systemPrompt = `You are an AI assistant that helps analyze construction job data. Your role is to parse user queries and extract:
1. Intent: What the user wants to know or do (analytics, prediction, action, comparison, general)
2. Entities: Specific job IDs, cost codes, dates, metrics mentioned
3. Context: Any implicit context from the conversation

Available intents:
- analytics: Questions about current status, metrics, performance
- prediction: Questions about future outcomes, forecasts
- action: Requests for recommendations or actions
- comparison: Comparing jobs or metrics
- general: General questions about available data, capabilities, or system information

Special handling:
- If user asks "what jobs can you access" or similar, use intent: "analytics" and queryType: "status"
- If user asks general questions without specific job references, use intent: "analytics" and queryType: "status"

Return a JSON object with this structure:
{
  "intent": "analytics|prediction|action|comparison|general",
  "entities": {
    "jobIds": ["job-id-1", "job-id-2"],
    "costCodes": ["code1", "code2"],
    "metrics": ["budget", "schedule", "progress"],
    "dateRange": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
    "comparisonType": "jobs|metrics|time"
  },
  "queryType": "status|variance|trend|forecast|recommendation|compare|general",
  "confidence": 0.0-1.0
}`;

      // Build conversation context
      let conversationContext = '';
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        conversationContext = '\n\nRecent conversation:\n' + 
          context.conversationHistory
            .slice(-4) // Last 4 messages for context
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');
      }

      const userMessage = `User query: "${query}"
${context.currentJobId ? `Current job context: ${context.currentJobId}` : ''}
${conversationContext}

Parse this query and return ONLY valid JSON.`;

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      // Fallback parsing
      return this.fallbackParse(query, context);
    } catch (error) {
      console.error('Error parsing query:', error);
      return this.fallbackParse(query, context);
    }
  }

  /**
   * Fallback parsing using simple pattern matching
   */
  fallbackParse(query, context) {
    const lowerQuery = query.toLowerCase();
    
    let intent = 'analytics';
    if (lowerQuery.includes('when will') || lowerQuery.includes('predict') || lowerQuery.includes('forecast')) {
      intent = 'prediction';
    } else if (lowerQuery.includes('what should') || lowerQuery.includes('recommend') || lowerQuery.includes('suggest')) {
      intent = 'action';
    } else if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('versus')) {
      intent = 'comparison';
    }

    // Extract job IDs (simple pattern)
    const jobIdPattern = /job[-\s]?(\w+-\d+-\w+-\d+)/gi;
    const jobIds = [];
    let match;
    while ((match = jobIdPattern.exec(query)) !== null) {
      jobIds.push(match[1]);
    }

    // Extract cost codes
    const costCodePattern = /cost\s*code\s*([A-Z0-9]+)/gi;
    const costCodes = [];
    while ((match = costCodePattern.exec(query)) !== null) {
      costCodes.push(match[1]);
    }

    // Determine query type
    let queryType = 'status';
    if (lowerQuery.includes('what jobs') || lowerQuery.includes('what data') || 
        lowerQuery.includes('what can you') || lowerQuery.includes('available')) {
      queryType = 'status'; // Will trigger fetching all jobs
    } else if (lowerQuery.includes('variance') || lowerQuery.includes('over budget')) {
      queryType = 'variance';
    } else if (lowerQuery.includes('trend') || lowerQuery.includes('over time')) {
      queryType = 'trend';
    } else if (lowerQuery.includes('forecast') || lowerQuery.includes('predict')) {
      queryType = 'forecast';
    } else if (lowerQuery.includes('recommend') || lowerQuery.includes('suggest')) {
      queryType = 'recommendation';
    } else if (lowerQuery.includes('compare')) {
      queryType = 'compare';
    }

    return {
      intent,
      entities: {
        jobIds: jobIds.length > 0 ? jobIds : (context.currentJobId ? [context.currentJobId] : []),
        costCodes,
        metrics: [],
        dateRange: null,
        comparisonType: null
      },
      queryType,
      confidence: 0.7
    };
  }

  /**
   * Classify intent
   */
  async classifyIntent(query) {
    const parsed = await this.parseQuery(query);
    return parsed.intent;
  }
}

module.exports = new QueryParser();

