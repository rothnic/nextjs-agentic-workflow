import { NextRequest } from 'next/server';
import { enrichLead } from '@/lib/workflows/vercel-lead-workflows';
import { Lead } from '@/lib/types/workflow';
import {
  createWorkflowRun,
  updateWorkflowStatus,
  updateStepStatus,
} from '@/lib/workflows/workflow-tracking';

export const maxDuration = 300; // 5 minutes for workflow execution

export async function POST(request: NextRequest) {
  let runId: string | undefined;

  try {
    const body = await request.json();
    const { leadId, lead } = body as { leadId: string; lead: Lead };

    if (!leadId || !lead) {
      return Response.json(
        { error: 'Missing required fields: leadId and lead' },
        { status: 400 }
      );
    }

    // Create workflow run for tracking
    const run = createWorkflowRun('enrich', leadId, [
      'Fetch Company Data',
      'Enrich Lead Profile',
      'Update Lead Record',
    ]);
    runId = run.id;

    // Mark as running
    updateWorkflowStatus(runId, 'running');
    updateStepStatus(runId, 0, 'running');

    // Execute the workflow
    const result = await enrichLead(leadId, lead);

    // Mark all steps as completed
    updateStepStatus(runId, 0, 'completed');
    updateStepStatus(runId, 1, 'completed');
    updateStepStatus(runId, 2, 'completed');

    // Mark workflow as completed
    updateWorkflowStatus(runId, 'completed', result);

    return Response.json({
      success: true,
      runId,
      result,
      message: 'Lead enrichment workflow completed',
    });
  } catch (error) {
    console.error('Enrichment workflow error:', error);

    if (runId) {
      updateWorkflowStatus(
        runId,
        'failed',
        undefined,
        error instanceof Error ? error.message : 'Enrichment failed'
      );
    }

    return Response.json(
      {
        success: false,
        runId,
        error: error instanceof Error ? error.message : 'Enrichment failed',
      },
      { status: 500 }
    );
  }
}
