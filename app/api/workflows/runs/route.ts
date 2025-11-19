import { getAllWorkflowRuns } from '@/lib/workflows/workflow-tracking';

/**
 * GET /api/workflows/runs - Get all workflow runs
 */
export async function GET() {
  try {
    console.log('[Workflow Runs API] Fetching all workflow runs...');
    const runs = await getAllWorkflowRuns();
    console.log('[Workflow Runs API] Found', runs.length, 'workflow runs');

    return Response.json(runs);
  } catch (error) {
    console.error('[Workflow Runs API] Error fetching workflow runs:', error);
    return Response.json(
      { error: 'Failed to fetch workflow runs' },
      { status: 500 }
    );
  }
}
