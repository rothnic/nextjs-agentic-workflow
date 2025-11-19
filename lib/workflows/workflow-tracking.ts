/**
 * Workflow tracking for monitoring execution status
 *
 * This module provides persistent tracking of workflow executions
 * using Vercel KV (Redis) with in-memory fallback for local development.
 */

import { nanoid } from 'nanoid';
import { kv } from '@vercel/kv';

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

// In-memory storage for workflow runs (fallback for local dev)
const workflowRuns = new Map<string, WorkflowRun>();

// Event listeners for real-time updates
type WorkflowListener = (run: WorkflowRun) => void;
const listeners = new Set<WorkflowListener>();

// Check if KV is available
const isKVAvailable = () => {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
};

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
export async function createWorkflowRun(
  workflowName: string,
  leadId: string,
  stepNames: string[]
): Promise<WorkflowRun> {
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

  // Store in both KV and in-memory
  if (isKVAvailable()) {
    try {
      await kv.set(`workflow:${runId}`, run);
      await kv.zadd('workflow:runs', { score: run.startTime, member: runId });
    } catch (error) {
      console.error('[Workflow Tracking] KV storage error:', error);
      // Fall back to in-memory
      workflowRuns.set(runId, run);
    }
  } else {
    workflowRuns.set(runId, run);
  }

  notifyListeners(run);

  return run;
}

/**
 * Update workflow run status
 */
export async function updateWorkflowStatus(
  runId: string,
  status: WorkflowRun['status'],
  result?: unknown,
  error?: string
) {
  let run: WorkflowRun | undefined | null;

  if (isKVAvailable()) {
    try {
      run = await kv.get<WorkflowRun>(`workflow:${runId}`);
    } catch (error) {
      console.error('[Workflow Tracking] KV get error:', error);
      run = workflowRuns.get(runId);
    }
  } else {
    run = workflowRuns.get(runId);
  }

  if (!run) return;

  run.status = status;
  if (result !== undefined) run.result = result;
  if (error !== undefined) run.error = error;
  if (status === 'completed' || status === 'failed') {
    run.endTime = Date.now();
  }

  // Update in both KV and in-memory
  if (isKVAvailable()) {
    try {
      await kv.set(`workflow:${runId}`, run);
    } catch (error) {
      console.error('[Workflow Tracking] KV set error:', error);
      workflowRuns.set(runId, run);
    }
  } else {
    workflowRuns.set(runId, run);
  }

  notifyListeners(run);
}

/**
 * Update a specific step status
 */
export async function updateStepStatus(
  runId: string,
  stepIndex: number,
  status: WorkflowStep['status'],
  result?: unknown
) {
  let run: WorkflowRun | undefined | null;

  if (isKVAvailable()) {
    try {
      run = await kv.get<WorkflowRun>(`workflow:${runId}`);
    } catch (error) {
      console.error('[Workflow Tracking] KV get error:', error);
      run = workflowRuns.get(runId);
    }
  } else {
    run = workflowRuns.get(runId);
  }

  if (!run || !run.steps[stepIndex]) return;

  const step = run.steps[stepIndex];
  step.status = status;

  if (status === 'running') {
    step.startTime = Date.now();
  } else if (status === 'completed' || status === 'failed') {
    step.endTime = Date.now();
    if (result !== undefined) step.result = result;
  }

  // Update in both KV and in-memory
  if (isKVAvailable()) {
    try {
      await kv.set(`workflow:${runId}`, run);
    } catch (error) {
      console.error('[Workflow Tracking] KV set error:', error);
      workflowRuns.set(runId, run);
    }
  } else {
    workflowRuns.set(runId, run);
  }

  notifyListeners(run);
}

/**
 * Get a workflow run by ID
 */
export async function getWorkflowRun(runId: string): Promise<WorkflowRun | undefined | null> {
  if (isKVAvailable()) {
    try {
      return await kv.get<WorkflowRun>(`workflow:${runId}`);
    } catch (error) {
      console.error('[Workflow Tracking] KV get error:', error);
      return workflowRuns.get(runId);
    }
  }
  return workflowRuns.get(runId);
}

/**
 * Get all workflow runs
 */
export async function getAllWorkflowRuns(): Promise<WorkflowRun[]> {
  if (isKVAvailable()) {
    try {
      // Get run IDs from sorted set
      const runIds = await kv.zrange<string[]>('workflow:runs', 0, -1, { rev: true });

      // Fetch all runs
      const runs: WorkflowRun[] = [];
      for (const runId of runIds) {
        const run = await kv.get<WorkflowRun>(`workflow:${runId}`);
        if (run) runs.push(run);
      }
      return runs;
    } catch (error) {
      console.error('[Workflow Tracking] KV get all error:', error);
      return Array.from(workflowRuns.values());
    }
  }
  return Array.from(workflowRuns.values());
}

/**
 * Get recent workflow runs (last N runs)
 */
export async function getRecentWorkflowRuns(limit: number = 10): Promise<WorkflowRun[]> {
  if (isKVAvailable()) {
    try {
      // Get recent run IDs from sorted set
      const runIds = await kv.zrange<string[]>('workflow:runs', 0, limit - 1, { rev: true });

      // Fetch runs
      const runs: WorkflowRun[] = [];
      for (const runId of runIds) {
        const run = await kv.get<WorkflowRun>(`workflow:${runId}`);
        if (run) runs.push(run);
      }
      return runs;
    } catch (error) {
      console.error('[Workflow Tracking] KV get recent error:', error);
      return getRecentWorkflowRunsFromMemory(limit);
    }
  }
  return getRecentWorkflowRunsFromMemory(limit);
}

/**
 * Get recent workflow runs from in-memory storage
 */
function getRecentWorkflowRunsFromMemory(limit: number = 10): WorkflowRun[] {
  const allRuns = Array.from(workflowRuns.values());
  return allRuns
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, limit);
}
