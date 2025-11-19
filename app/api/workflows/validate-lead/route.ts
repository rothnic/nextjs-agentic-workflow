import { NextRequest } from 'next/server';
import { start } from 'workflow/api';
import { validateLead } from '@/lib/workflows/vercel-lead-workflows';
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
    const run = await createWorkflowRun('validate', leadId, [
      'Validate Email Format',
      'Validate Domain',
      'Finalize Validation',
    ]);
    runId = run.id;

    // Mark as running
    await updateWorkflowStatus(runId, 'running');

    // Execute the workflow using start() from workflow/api
    await updateStepStatus(runId, 0, 'running');

    const result = await start(validateLead, [leadId, lead]);

    // Mark all steps as completed (Vercel Workflow handles the internals)
    await updateStepStatus(runId, 0, 'completed');
    await updateStepStatus(runId, 1, 'completed');
    await updateStepStatus(runId, 2, 'completed');

    // Mark workflow as completed
    await updateWorkflowStatus(runId, 'completed', result);

    return Response.json({
      success: true,
      runId,
      result,
      message: 'Lead validation workflow completed',
    });
  } catch (error) {
    console.error('Validation workflow error:', error);

    if (runId) {
      await updateWorkflowStatus(
        runId,
        'failed',
        undefined,
        error instanceof Error ? error.message : 'Validation failed'
      );
    }

    return Response.json(
      {
        success: false,
        runId,
        error: error instanceof Error ? error.message : 'Validation failed',
      },
      { status: 500 }
    );
  }
}
