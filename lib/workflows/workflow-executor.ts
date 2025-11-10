import { WorkflowExecution, WorkflowStep } from '../types/workflow';
import { nanoid } from 'nanoid';

// Simulated delay to make workflow steps visible
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory storage for workflow executions (for demo purposes)
const workflowExecutions = new Map<string, WorkflowExecution>();

// Event emitter for real-time updates
type WorkflowListener = (execution: WorkflowExecution) => void;
const listeners = new Set<WorkflowListener>();

export function subscribeToWorkflow(listener: WorkflowListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(execution: WorkflowExecution) {
  listeners.forEach(listener => listener(execution));
}

export function getWorkflowExecution(id: string): WorkflowExecution | undefined {
  return workflowExecutions.get(id);
}

export function getAllWorkflowExecutions(): WorkflowExecution[] {
  return Array.from(workflowExecutions.values());
}

/**
 * Creates a new workflow execution with the specified steps
 */
export function createWorkflowExecution(
  workflowName: string,
  leadId: string,
  steps: Omit<WorkflowStep, 'id' | 'status'>[]
): WorkflowExecution {
  const executionId = nanoid();
  const execution: WorkflowExecution = {
    id: executionId,
    workflowName,
    leadId,
    status: 'running',
    steps: steps.map(step => ({
      ...step,
      id: nanoid(),
      status: 'pending' as const,
    })),
    startTime: Date.now(),
  };

  workflowExecutions.set(executionId, execution);
  notifyListeners(execution);

  return execution;
}

/**
 * Updates a workflow step status and notifies listeners
 */
export function updateStepStatus(
  execution: WorkflowExecution,
  stepIndex: number,
  status: 'running' | 'completed' | 'failed',
  result?: unknown
): void {
  const step = execution.steps[stepIndex];

  if (status === 'running') {
    step.status = status;
    step.startTime = Date.now();
  } else {
    step.status = status;
    step.endTime = Date.now();
    if (result !== undefined) {
      step.result = result;
    }
  }

  notifyListeners(execution);
}

/**
 * Completes a workflow execution
 */
export function completeWorkflow(
  execution: WorkflowExecution,
  status: 'completed' | 'failed',
  result?: unknown
): void {
  execution.status = status;
  execution.endTime = Date.now();
  if (result !== undefined) {
    execution.result = result;
  }
  notifyListeners(execution);
}

/**
 * Generic workflow executor that runs steps sequentially
 */
export async function executeWorkflow<T>(
  workflowName: string,
  leadId: string,
  steps: Array<{
    name: string;
    execute: () => Promise<T>;
  }>,
  onComplete: (results: T[]) => unknown
): Promise<WorkflowExecution> {
  const execution = createWorkflowExecution(
    workflowName,
    leadId,
    steps.map(s => ({ name: s.name }))
  );

  try {
    const results: T[] = [];

    for (let i = 0; i < steps.length; i++) {
      updateStepStatus(execution, i, 'running');

      const result = await steps[i].execute();
      results.push(result);

      updateStepStatus(execution, i, 'completed', result);
    }

    const finalResult = onComplete(results);
    completeWorkflow(execution, 'completed', finalResult);

  } catch (error) {
    completeWorkflow(execution, 'failed', { error: (error as Error).message });
  }

  return execution;
}

/**
 * Helper to execute a step with automatic error handling
 */
export async function executeStep<T>(
  execution: WorkflowExecution,
  stepIndex: number,
  stepFn: () => Promise<T>
): Promise<T> {
  try {
    updateStepStatus(execution, stepIndex, 'running');
    const result = await stepFn();
    updateStepStatus(execution, stepIndex, 'completed', result);
    return result;
  } catch (error) {
    updateStepStatus(execution, stepIndex, 'failed', { error: (error as Error).message });
    throw error;
  }
}
