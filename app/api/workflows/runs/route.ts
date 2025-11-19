import { NextRequest } from 'next/server';
import { getAllWorkflowRuns } from '@/lib/workflows/workflow-tracking';

/**
 * GET /api/workflows/runs - Get all workflow runs
 */
export async function GET(request: NextRequest) {
  try {
    const runs = await getAllWorkflowRuns();

    return Response.json(runs);
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    return Response.json(
      { error: 'Failed to fetch workflow runs' },
      { status: 500 }
    );
  }
}
