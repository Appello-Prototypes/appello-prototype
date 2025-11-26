# AI Intelligence Layer Setup Guide

## 🚀 Quick Start

The AI Intelligence Layer is now integrated into your task management system! Here's how to get it running.

## Prerequisites

1. **Anthropic API Key**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. **Environment Variables**: Add your API key to `.env.local`

## Setup Steps

### 1. Add API Key to Environment Variables

Add this to your `.env.local` file:

```bash
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### 2. Install Dependencies

Dependencies are already installed, but if you need to reinstall:

```bash
npm install @anthropic-ai/sdk
```

### 3. Start the Application

```bash
npm run dev
```

### 4. Access the AI Assistant

The AI Assistant is available in two ways:

1. **Global Access**: Floating button in bottom-right corner (available on all pages)
2. **Job-Specific**: Integrated into Job Overview pages with job context

## Features

### 🤖 Conversational Interface

Ask questions in natural language:

- **Status Queries**: "What's the current status of Job JOB-2024-INS-002?"
- **Analytics**: "Show me budget variance for this job"
- **Predictions**: "When will this job be complete?"
- **Recommendations**: "What should I focus on?"
- **Comparisons**: "Compare this job with others"

### 📊 Analytics Capabilities

The AI can provide:

- **Earned Value Management (EVM)**: SPI, CPI, variance analysis
- **Budget Analysis**: Cost code performance, variance tracking
- **Schedule Analysis**: Progress tracking, timeline forecasts
- **Team Performance**: Productivity metrics, utilization analysis
- **Job Health Scores**: Overall job health indicators

### 🔮 Predictive Features

- **Cost Forecasting**: Predict final job costs
- **Schedule Forecasting**: Predict completion dates
- **Risk Identification**: Identify potential issues early

## API Endpoints

### Chat Endpoint

```bash
POST /api/ai/chat
Body: {
  "message": "What's the status of this job?",
  "context": {
    "currentJobId": "job-id-here"
  }
}
```

### Analytics Endpoint

```bash
GET /api/ai/jobs/:id/analytics
```

### Forecast Endpoint

```bash
GET /api/ai/jobs/:id/forecast?type=completion
GET /api/ai/jobs/:id/forecast?type=cost
```

## Example Queries

### Status Queries
```
"What's the current status of Job JOB-2024-INS-002?"
"Show me all jobs that are over budget"
"Which cost codes are burning faster than planned?"
```

### Analytics Queries
```
"Show me budget variance"
"What's the earned value for this job?"
"Compare progress across all active jobs"
```

### Predictive Queries
```
"When will Job JOB-2024-INS-002 be complete?"
"What's the predicted final cost?"
"Which jobs are at risk of going over budget?"
```

### Action Queries
```
"What should I focus on today?"
"Suggest actions to get Job X back on track"
"Generate a progress report for Job Y"
```

## Architecture

The AI layer consists of:

1. **Data Access Layer** (`src/server/services/ai/dataAccess.js`)
   - Aggregates job data from MongoDB
   - Calculates metrics and KPIs

2. **Analytics Engine** (`src/server/services/ai/analyticsEngine.js`)
   - EVM calculations
   - Variance analysis
   - Trend analysis
   - Job comparisons

3. **Query Parser** (`src/server/services/ai/queryParser.js`)
   - Uses Anthropic Claude to parse natural language
   - Extracts intent and entities
   - Routes to appropriate handlers

4. **Response Generator** (`src/server/services/ai/responseGenerator.js`)
   - Uses Anthropic Claude to generate natural language responses
   - Formats data for presentation
   - Suggests visualizations

5. **Chat Controller** (`src/server/controllers/aiController.js`)
   - Handles chat requests
   - Orchestrates data fetching and response generation

6. **Frontend Component** (`src/client/src/components/AIAssistant.jsx`)
   - Chat UI interface
   - Message history
   - Suggested queries

## Troubleshooting

### API Key Not Set

**Error**: "ANTHROPIC_API_KEY environment variable is not set"

**Solution**: Add `ANTHROPIC_API_KEY` to your `.env.local` file

### API Errors

**Error**: "Error processing AI query"

**Solution**: 
1. Check your API key is valid
2. Check Anthropic API status
3. Review server logs for detailed error messages

### No Response

**Issue**: AI Assistant doesn't respond

**Solution**:
1. Check browser console for errors
2. Check server logs
3. Verify API endpoint is accessible
4. Check network tab for failed requests

## Production Deployment

### Vercel Environment Variables

Add `ANTHROPIC_API_KEY` to your Vercel environment variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `ANTHROPIC_API_KEY` with your production API key
3. Redeploy your application

### Security Notes

- Never commit API keys to git
- Use environment variables for all sensitive data
- Rotate API keys regularly
- Monitor API usage and costs

## Cost Management

Anthropic API pricing:
- Claude 3.5 Sonnet: Check [Anthropic Pricing](https://www.anthropic.com/pricing)

Tips to manage costs:
- Use caching for repeated queries
- Implement rate limiting
- Monitor API usage
- Use fallback responses for simple queries

## Next Steps

1. ✅ Add your Anthropic API key
2. ✅ Test the chat interface
3. ✅ Try different query types
4. ✅ Explore analytics endpoints
5. 🔄 Customize responses (optional)
6. 🔄 Add more analytics (optional)
7. 🔄 Implement autonomous agents (future)

## Support

For issues or questions:
1. Check server logs: `npm run dev` (server console)
2. Check browser console for frontend errors
3. Review API documentation in `AI_INTELLIGENCE_LAYER.md`

---

**Status**: ✅ Core functionality complete and ready to use!

