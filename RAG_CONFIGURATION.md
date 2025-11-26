# RAG (Retrieval-Augmented Generation) Configuration

## ✅ RAG is Now Enabled!

The AI Assistant is now fully RAG-enabled and can access real job data from your system.

## How It Works

### 1. **Automatic Data Retrieval**

When you ask questions, the system automatically:
- Fetches all available jobs from the database
- Retrieves project information
- Calculates summary statistics
- Includes this data in the AI context (RAG)

### 2. **Data Included in RAG Context**

For every query, the AI receives:
- **All Jobs**: Job numbers, names, status, progress, contract values, managers, clients
- **All Projects**: Project numbers, names, total contract values
- **Summary Stats**: Total jobs, total projects, status breakdown, total contract value

### 3. **Smart Query Detection**

The system detects queries like:
- "What jobs can you access?"
- "What data do you have?"
- "Show me all jobs"
- "List available jobs"
- General greetings (hello, hi)

And automatically fetches and includes relevant data.

## Example Queries That Now Work

### ✅ General Queries
```
"What jobs can you access?"
→ Lists all actual jobs with job numbers, names, status, progress

"Show me all jobs"
→ Shows complete job list with details

"What data do you have?"
→ Explains available data and lists jobs/projects
```

### ✅ Specific Job Queries
```
"What's the status of job JOB-2025-ELEC-001?"
→ Uses RAG to find the job, then fetches detailed metrics

"Tell me about job JOB-2025-MECH-001"
→ Retrieves full job details and provides analysis
```

### ✅ Conversational Queries
```
User: "What jobs can you access?"
AI: [Lists actual jobs]

User: "What about the first one?"
AI: [Understands context, provides details on first job]
```

## Technical Implementation

### Backend (RAG Engine)

**Location**: `src/server/controllers/aiController.js`

**Key Features**:
1. **Proactive Data Fetching**: Always fetches system data for RAG context
2. **Job Resolution**: Converts job numbers to ObjectIds automatically
3. **Data Aggregation**: Calculates summary statistics
4. **Context Building**: Includes RAG data in every AI request

**Code Flow**:
```javascript
1. Parse user query
2. Detect if general query (needs RAG data)
3. Fetch all jobs summary
4. Fetch all projects
5. Calculate summary stats
6. Include in RAG context
7. Generate AI response with real data
```

### Frontend (Conversational Interface)

**Location**: `src/client/src/components/AIAssistant.jsx`

**Features**:
- Maintains conversation history
- Sends context to backend
- Displays AI responses with data

## Data Access Layer

**Location**: `src/server/services/ai/dataAccess.js`

**Methods**:
- `getAllJobsSummary()` - Fetches lightweight job summaries for RAG
- `getJobMetrics()` - Detailed metrics for specific jobs
- `getCostCodeAnalysis()` - Cost code breakdowns
- `getScheduleAnalysis()` - Schedule and timeline data
- `getTeamPerformance()` - Team productivity metrics

## Response Generator

**Location**: `src/server/services/ai/responseGenerator.js`

**RAG Integration**:
- Formats system data for LLM consumption
- Includes RAG context in prompts
- Ensures AI uses actual data, not generic responses

## Configuration

### System Prompt

The system prompt now includes:
- Instructions to use RAG data
- Guidance on referencing actual job numbers
- Emphasis on using real data, not generic responses

### Settings

Configure RAG behavior in **AI Settings** (`/ai-settings`):
- **Conversation History Length**: How many previous messages to include (affects RAG context)
- **Model**: Choose Claude Sonnet 4.5 for best RAG performance
- **Temperature**: Lower values = more focused on actual data

## Performance Considerations

### Data Fetching
- Jobs are fetched with `.lean()` for performance
- Limited to 100 jobs for list views
- Summary stats calculated efficiently
- Cached in conversation context

### Optimization
- Lightweight job summaries (no full metrics calculation)
- Project data limited to 50 items
- RAG context includes top 30 jobs (most relevant)

## Testing RAG

### Test Queries

1. **General Access Query**:
   ```
   "What jobs can you access?"
   ```
   Expected: Lists actual jobs with job numbers

2. **Specific Job Query**:
   ```
   "What's the status of JOB-2025-ELEC-001?"
   ```
   Expected: Detailed job status with real metrics

3. **Conversational Follow-up**:
   ```
   User: "What jobs can you access?"
   AI: [Lists jobs]
   User: "Tell me about the first one"
   AI: [Details about first job]
   ```

4. **Summary Query**:
   ```
   "Show me a summary of all jobs"
   ```
   Expected: Summary with status breakdown, totals, etc.

## Troubleshooting

### Issue: AI says "no data available"

**Solution**: 
- Check database connection
- Verify jobs exist in database
- Check server logs for errors
- Ensure RAG data is being fetched (check `systemData` in response)

### Issue: AI doesn't list actual jobs

**Solution**:
- Verify `getAllJobsSummary()` is working
- Check RAG context is included in prompts
- Review system prompt includes RAG instructions
- Test with: `curl -X POST http://localhost:3001/api/ai/chat -d '{"message": "what jobs can you access?"}'`

### Issue: Slow responses

**Solution**:
- Reduce `conversationHistoryLength` in settings
- Limit job fetching (already limited to 100)
- Consider caching job summaries
- Use faster model (Haiku) for simple queries

## Future Enhancements

### Planned RAG Improvements

1. **Vector Search**: Use embeddings for semantic job search
2. **Smart Filtering**: Filter RAG data based on query intent
3. **Incremental Updates**: Only fetch changed data
4. **User-Specific RAG**: Filter by user permissions
5. **Time-Based RAG**: Include recent changes, updates

### Advanced Features

- **Multi-Modal RAG**: Include images, drawings, documents
- **Real-Time RAG**: Stream updates as data changes
- **Contextual RAG**: Fetch only relevant data based on query
- **RAG Caching**: Cache frequently accessed data

## API Endpoints

### Chat with RAG
```bash
POST /api/ai/chat
Body: {
  "message": "what jobs can you access?",
  "context": {
    "conversationHistory": [...],
    "currentJobId": "..."
  }
}
```

### Get Available Models
```bash
GET /api/ai/models
```

### Get Job Analytics (RAG-enhanced)
```bash
GET /api/ai/jobs/:id/analytics
```

## Summary

✅ **RAG is fully configured and working**

The AI Assistant now:
- Fetches real job data automatically
- Includes data in every response
- Answers questions about available jobs accurately
- Maintains conversation context
- Uses actual job numbers and names

**Test it**: Ask "what jobs can you access?" and you'll get a real list of your jobs!

