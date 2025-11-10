/**
 * Workflow tracking for monitoring execution status
 *
 * This module provides in-memory tracking of workflow executions
 * for real-time status updates in the UI.
 */

import { nanoid } from 'nanoid';

export interface WorkflowRun {
  id: string;
  workflowName: string;
  leadId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  result?: unknown;
  error?: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  result?: unknown;
}

// In-memory storage for workflow runs
const workflowRuns = new Map<string, WorkflowRun>();

// Event listeners for real-time updates
type WorkflowListener = (run: WorkflowRun) => void;
const listeners = new Set<WorkflowListener>();

/**
 * Subscribe to workflow run updates
 */
export function subscribeToWorkflowRuns(listener: WorkflowListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of a workflow update
 */
function notifyListeners(run: WorkflowRun) {
  listeners.forEach(listener => listener(run));
}

/**
 * Create a new workflow run
 */
export function createWorkflowRun(
  workflowName: string,
  leadId: string,
  stepNames: string[]
): WorkflowRun {
  const runId = nanoid();
  const run: WorkflowRun = {
    id: runId,
    workflowName,
    leadId,
    status: 'pending',
    startTime: Date.now(),
    steps: stepNames.map(name => ({
      id: nanoid(),
      name,
      status: 'pending' as const,
    })),
  };

  workflowRuns.set(runId, run);
  notifyListeners(run);

  return run;
}

/**
 * Update workflow run status
 */
export function updateWorkflowStatus(
  runId: string,
  status: WorkflowRun['status'],
  result?: unknown,
  error?: string
) {
  const run = workflowRuns.get(runId);
  if (!run) return;

  run.status = status;
  if (result !== undefined) run.result = result;
  if (error !== undefined) run.error = error;
  if (status === 'completed' || status === 'failed') {
    run.endTime = Date.now();
  }

  notifyListeners(run);
}

/**
 * Update a specific step status
 */
export function updateStepStatus(
  runId: string,
  stepIndex: number,
  status: WorkflowStep['status'],
  result?: unknown
) {
  const run = workflowRuns.get(runId);
  if (!run || !run.steps[stepIndex]) return;

  const step = run.steps[stepIndex];
  step.status = status;

  if (status === 'running') {
    step.startTime = Date.now();
  } else if (status === 'completed' || status === 'failed') {
    step.endTime = Date.now();
    if (result !== undefined) step.result = result;
  }

  notifyListeners(run);
}

/**
 * Get a workflow run by ID
 */
export function getWorkflowRun(runId: string): WorkflowRun | undefined {
  return workflowRuns.get(runId);
}

/**
 * Get all workflow runs
 */
export function getAllWorkflowRuns(): WorkflowRun[] {
  return Array.from(workflowRuns.values());
}

/**
 * Get recent workflow runs (last N runs)
 */
export function getRecentWorkflowRuns(limit: number = 10): WorkflowRun[] {
  const allRuns = getAllWorkflowRuns();
  return allRuns
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, limit);
}
