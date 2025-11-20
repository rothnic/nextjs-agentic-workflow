# Troubleshooting Guide

## Chat Errors

### Error: "3:An error occurred."

This is a generic error from the chat endpoint. To diagnose:

1. **Check Server Logs**: Look for detailed error messages in your terminal/console. The chat endpoint now logs comprehensive error information:
   ```
   [Chat] ==================== ERROR ====================
   [Chat] Error in POST handler: ...
   [Chat] Error message: ...
   [Chat] Error stack: ...
   ```

2. **Test Your Configuration**: Use the diagnostic endpoint to validate your API key and provider settings:
   ```bash
   curl -X POST http://localhost:3000/api/test-config \
     -H "Content-Type: application/json" \
     -d '{
       "provider": "openrouter",
       "apiKey": "sk-or-v1-...",
       "model": "anthropic/claude-3.5-sonnet"
     }'
   ```

3. **Common Issues**:
   - **Invalid API Key Format**: Make sure your API key doesn't have prefixes like `OPENROUTER_API_KEY=`
   - **Quotes in API Key**: Remove any quotes around the API key
   - **Wrong Model Name**: Verify the model ID is correct for your provider
   - **Network Issues**: Check if you can reach the provider's API endpoint

### API Key Configuration

The chat endpoint automatically sanitizes API keys by:
- Trimming whitespace
- Removing environment variable prefixes (`OPENROUTER_API_KEY=`, `OPENAI_API_KEY=`)
- Removing surrounding quotes

**Correct format**: `sk-or-v1-1234567890abcdef...`

**Will be auto-fixed**:
- `OPENROUTER_API_KEY=sk-or-v1-...`
- `"sk-or-v1-..."`
- ` sk-or-v1-... ` (with spaces)

## Workflow Errors

### Error: "`sleep()` can only be called inside a workflow function"

**Cause**: The `sleep()` function from Vercel Workflow requires the workflow context provided by `'use step'` or `'use workflow'` directives.

**Solution**: Always call `sleep()` directly within step functions, not through wrapper functions:

✅ **Correct**:
```typescript
async function myStep() {
  'use step';
  await sleep(2000);  // Direct call within step context
  // ... rest of logic
}
```

❌ **Incorrect**:
```typescript
async function delay(ms: number) {
  await sleep(ms);  // No workflow context!
}

async function myStep() {
  'use step';
  await delay(2000);  // This will fail
}
```

### Polling Doesn't Stop After Workflow Completes

**Check**:
1. Workflow status is properly updated to 'completed' or 'failed'
2. No workflows stuck in 'pending' or 'running' state
3. Browser console for any JavaScript errors

**Solution**: Click the "Refresh" button manually to update status, or wait for the 60-second polling timeout.

## Development Tips

### Enable Detailed Logging

The chat endpoint now includes extensive logging. Check your terminal for:
- `[Chat] Received chat request` - Request received
- `[Chat] Config: {...}` - Configuration details
- `[Chat] Using OpenRouter/OpenAI` - Provider selection
- `[Chat] API key length after sanitization: X` - Key validation
- `[Chat] Model created successfully` - Model initialization
- `[Chat] streamText created, returning response` - Successful request

### Test Configuration Without Sending Messages

Use the `/api/test-config` endpoint to validate your configuration:

```javascript
fetch('/api/test-config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'openrouter',
    apiKey: 'your-api-key-here',
    model: 'anthropic/claude-3.5-sonnet',
    baseUrl: 'https://openrouter.ai/api/v1'
  })
}).then(r => r.json()).then(console.log);
```

### Common Configuration Issues

1. **OpenRouter**:
   - Base URL should be: `https://openrouter.ai/api/v1`
   - API keys start with: `sk-or-v1-`
   - Model format: `provider/model-name` (e.g., `anthropic/claude-3.5-sonnet`)

2. **OpenAI**:
   - No custom base URL needed
   - API keys start with: `sk-`
   - Model format: `gpt-4-turbo`, `gpt-3.5-turbo`, etc.

3. **Browser Storage**:
   - Configuration is saved in localStorage
   - Clear localStorage if you're seeing stale config
   - Check browser DevTools > Application > Local Storage

## In-Memory Tracking Limitations

The workflow tracking system (`lib/workflows/workflow-tracking.ts`) uses in-memory storage:

**Development**: ✅ Works fine
**Production**: ⚠️ Has limitations
- Won't persist across server restarts
- Won't work across multiple serverless instances
- Vercel serverless functions are ephemeral

**For Production**: Consider using:
- PostgreSQL/MySQL database
- Redis for real-time updates
- Vercel Workflow's built-in tracking at useworkflow.dev

## Getting Help

If you're still experiencing issues:

1. Check the server logs for detailed error messages
2. Try the `/api/test-config` endpoint to validate your setup
3. Verify your API key is valid by testing it with the provider's API directly
4. Check the browser console for client-side errors
5. Review the VERCEL_WORKFLOW_IMPLEMENTATION.md for architecture details
