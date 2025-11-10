import { NextRequest } from 'next/server';
import { getWorkflowRun } from '@/lib/workflows/workflow-tracking';

/**
 * GET /api/workflows/runs/[runId] - Get a specific workflow run
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const run = getWorkflowRun(runId);

    if (!run) {
      return Response.json(
        { error: 'Workflow run not found' },
        { status: 404 }
      );
    }

    return Response.json(run);
  } catch (error) {
    console.error('Error fetching workflow run:', error);
    return Response.json(
      { error: 'Failed to fetch workflow run' },
      { status: 500 }
    );
  }
}
