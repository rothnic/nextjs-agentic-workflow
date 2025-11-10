# Vercel Workflow DevKit Implementation

This document describes the migration from custom workflow implementation to Vercel Workflow DevKit.

## Overview

The application now uses **Vercel Workflow DevKit** to implement durable, observable workflows for lead processing. Each workflow uses the `"use workflow"` directive and each step uses the `"use step"` directive for automatic retries and durability.

## Architecture

### Workflow Functions

Located in `lib/workflows/vercel-lead-workflows.ts`:

- **validateLead** - Validates email format and domain (3 steps)
- **enrichLead** - Enriches lead with company data (3 steps)
- **scoreLead** - Scores lead based on available data (3 steps)
- **processLead** - Runs complete pipeline (validate + enrich + score)

All workflows use:
- `"use workflow"` directive for durability
- `"use step"` directive on each step for automatic retries
- Configurable delays (2-3 seconds per step) for visibility

### API Routes

Workflows are exposed via API routes in `app/api/workflows/`:

- `/api/workflows/validate-lead` - POST to validate a lead
- `/api/workflows/enrich-lead` - POST to enrich a lead
- `/api/workflows/score-lead` - POST to score a lead
- `/api/workflows/process-lead` - POST to process a lead through all workflows

Each endpoint:
1. Creates a workflow run for tracking (`createWorkflowRun`)
2. Executes the Vercel workflow function
3. Updates step statuses as the workflow progresses
4. Returns a `runId` for tracking

### Status Tracking

**Tracking System** (`lib/workflows/workflow-tracking.ts`):
- In-memory storage of workflow runs
- Real-time status updates via listeners
- Tracks workflow and step status, timing, results

**Status API** (`/api/workflows/runs`):
- `GET /api/workflows/runs` - Get all workflow runs
- `GET /api/workflows/runs/[runId]` - Get specific run details

### UI Components

**WorkflowStatus** (`components/WorkflowStatus.tsx`):
- Displays recent workflow runs and their steps
- **Smart polling**: Automatically polls for 60 seconds after workflow starts
- Stops polling when:
  - All workflows are completed/failed
  - 60 seconds have elapsed
  - User closes/leaves the page
- Manual refresh button available
- Shows real-time status updates during polling

### Chat Integration

The AI chat agent (`app/api/chat/route.ts`) triggers workflows via direct function calls:

```typescript
// Example: When user asks to validate a lead
validateLead: tool({
  execute: async ({ leadId, email, name, company, phone }) => {
    const result = await executeWorkflowWithTracking('validate', leadId, lead, [
      'Validate Email Format',
      'Validate Domain',
      'Finalize Validation',
    ]);
    return {
      success: result.success,
      runId: result.runId,
      message: 'Lead validation workflow started',
    };
  },
}),
```

**Note**: Workflows are now executed directly in-process rather than via HTTP calls. This avoids hardcoded localhost URLs and ensures workflows work correctly in production environments.

## Configuration

### Environment Variables

```bash
# Enable/disable artificial delays for demo purposes
WORKFLOW_ENABLE_DELAYS=true  # Set to 'false' to disable delays
```

### Delays Configuration

Delays are controlled via the `STEP_DELAYS` constant in `lib/workflows/vercel-lead-workflows.ts` and can be enabled/disabled via the `WORKFLOW_ENABLE_DELAYS` environment variable.

## Benefits of Vercel Workflow DevKit

✅ **Durability**: Workflows survive server restarts and network failures
✅ **Automatic Retries**: Steps automatically retry on failure
✅ **Observability**: Built-in monitoring and status tracking
✅ **Scalability**: Handles concurrent workflows efficiently
✅ **Type Safety**: Full TypeScript support with `"use workflow"` and `"use step"` directives
✅ **Developer Experience**: Simple, intuitive API with familiar async/await patterns

## Workflow Execution Flow

1. **User Action**: User submits a lead via chat
2. **Tool Execution**: Chat agent calls `executeWorkflowWithTracking()`
3. **Workflow Creation**: Helper function creates workflow run for tracking
4. **Workflow Execution**: Vercel Workflow DevKit executes workflow function directly
5. **Status Updates**: Each step updates status in real-time as it executes
6. **Polling**: UI automatically polls for 60 seconds
7. **Completion**: Workflow completes, polling stops
8. **Manual Refresh**: User can manually refresh after polling stops

## Testing

To test the workflows:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser

3. Submit a lead via chat:
   ```
   Submit lead: test@example.com, Test User, Test Company
   ```

4. Watch the Workflow Status panel:
   - Status automatically updates every 1.5 seconds
   - Each step transitions: pending → running → completed
   - Polling stops after all workflows complete or after 60 seconds
   - Click "Refresh" to manually update status

## Monitoring

### In-App Monitoring
- Workflow Status panel shows recent runs
- Real-time step-by-step progression
- Duration tracking for each step and overall workflow
- Error messages displayed if workflow fails

### Future Enhancements
- Integration with Vercel Workflow Web UI (useworkflow.dev)
- OpenTelemetry support for production monitoring
- Workflow history and analytics
- Retry configuration per step
- Workflow cancellation

## Key Files

- `lib/workflows/vercel-lead-workflows.ts` - Workflow definitions with "use workflow" and "use step" directives
- `lib/workflows/workflow-tracking.ts` - In-memory status tracking system
- `app/api/workflows/*/route.ts` - Workflow API endpoints (for external/REST access)
- `app/api/workflows/runs/route.ts` - Status API for polling
- `components/WorkflowStatus.tsx` - UI component with smart polling
- `components/ChatInterface.tsx` - Chat UI with workflow tool integration
- `app/api/chat/route.ts` - AI agent integration with direct workflow execution

## Important Notes

### Sleep/Delay Usage
**Critical**: The `sleep()` function from the `workflow` package must be called directly within functions marked with `'use step'` or `'use workflow'`. Do not wrap it in helper functions, as sleep requires the workflow context to function correctly.

### In-Memory Tracking Limitations
The current tracking system (`lib/workflows/workflow-tracking.ts`) uses in-memory storage. This works for development but has limitations in production:
- Won't persist across server restarts
- Won't work across multiple serverless instances
- For production, consider using:
  - A database (PostgreSQL, MySQL, etc.)
  - Redis for real-time updates
  - Vercel Workflow's built-in tracking at useworkflow.dev

### API Key Configuration
The chat endpoint sanitizes API keys from the client config to remove any environment variable prefixes (e.g., `OPENROUTER_API_KEY=`) that might be accidentally included.
