import {
  createWorkflowExecution,
  updateStepStatus,
  completeWorkflow,
  executeWorkflow,
  executeStep,
  subscribeToWorkflow,
  getWorkflowExecution,
  getAllWorkflowExecutions,
  delay,
} from '@/lib/workflows/workflow-executor';
import { WorkflowExecution } from '@/lib/types/workflow';

describe('Workflow Executor', () => {
  describe('createWorkflowExecution', () => {
    it('should create a new workflow execution with pending steps', () => {
      const execution = createWorkflowExecution('test-workflow', 'lead-123', [
        { name: 'Step 1' },
        { name: 'Step 2' },
        { name: 'Step 3' },
      ]);

      expect(execution.id).toBeDefined();
      expect(execution.workflowName).toBe('test-workflow');
      expect(execution.leadId).toBe('lead-123');
      expect(execution.status).toBe('running');
      expect(execution.steps).toHaveLength(3);
      expect(execution.steps.every(step => step.status === 'pending')).toBe(true);
      expect(execution.startTime).toBeDefined();
    });

    it('should assign unique IDs to steps', () => {
      const execution = createWorkflowExecution('test', 'lead-1', [
        { name: 'Step 1' },
        { name: 'Step 2' },
      ]);

      const stepIds = execution.steps.map(s => s.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
    });
  });

  describe('updateStepStatus', () => {
    it('should update step to running status', () => {
      const execution = createWorkflowExecution('test', 'lead-1', [
        { name: 'Step 1' },
      ]);

      updateStepStatus(execution, 0, 'running');

      expect(execution.steps[0].status).toBe('running');
      expect(execution.steps[0].startTime).toBeDefined();
    });

    it('should update step to completed status with result', () => {
      const execution = createWorkflowExecution('test', 'lead-1', [
        { name: 'Step 1' },
      ]);

      updateStepStatus(execution, 0, 'running');
      updateStepStatus(execution, 0, 'completed', { data: 'test result' });

      expect(execution.steps[0].status).toBe('completed');
      expect(execution.steps[0].endTime).toBeDefined();
      expect(execution.steps[0].result).toEqual({ data: 'test result' });
    });

    it('should update step to failed status', () => {
      const execution = createWorkflowExecution('test', 'lead-1', [
        { name: 'Step 1' },
      ]);

      updateStepStatus(execution, 0, 'running');
      updateStepStatus(execution, 0, 'failed', { error: 'Test error' });

      expect(execution.steps[0].status).toBe('failed');
      expect(execution.steps[0].endTime).toBeDefined();
      expect(execution.steps[0].result).toEqual({ error: 'Test error' });
    });
  });

  describe('completeWorkflow', () => {
    it('should complete workflow successfully', () => {
      const execution = createWorkflowExecution('test', 'lead-1', [
        { name: 'Step 1' },
      ]);

      completeWorkflow(execution, 'completed', { finalResult: 'success' });

      expect(execution.status).toBe('completed');
      expect(execution.endTime).toBeDefined();
      expect(execution.result).toEqual({ finalResult: 'success' });
    });

    it('should fail workflow', () => {
      const execution = createWorkflowExecution('test', 'lead-1', [
        { name: 'Step 1' },
      ]);

      completeWorkflow(execution, 'failed', { error: 'Workflow failed' });

      expect(execution.status).toBe('failed');
      expect(execution.endTime).toBeDefined();
      expect(execution.result).toEqual({ error: 'Workflow failed' });
    });
  });

  describe('executeWorkflow', () => {
    it('should execute all steps sequentially', async () => {
      const stepResults: number[] = [];

      const execution = await executeWorkflow(
        'test-workflow',
        'lead-1',
        [
          {
            name: 'Step 1',
            execute: async () => {
              stepResults.push(1);
              return 'result1';
            },
          },
          {
            name: 'Step 2',
            execute: async () => {
              stepResults.push(2);
              return 'result2';
            },
          },
          {
            name: 'Step 3',
            execute: async () => {
              stepResults.push(3);
              return 'result3';
            },
          },
        ],
        (results) => ({ combined: results.join(',') })
      );

      expect(stepResults).toEqual([1, 2, 3]);
      expect(execution.status).toBe('completed');
      expect(execution.result).toEqual({ combined: 'result1,result2,result3' });
      expect(execution.steps.every(s => s.status === 'completed')).toBe(true);
    });

    it('should handle step failures', async () => {
      const execution = await executeWorkflow(
        'test-workflow',
        'lead-1',
        [
          {
            name: 'Step 1',
            execute: async () => 'success',
          },
          {
            name: 'Step 2',
            execute: async () => {
              throw new Error('Step 2 failed');
            },
          },
          {
            name: 'Step 3',
            execute: async () => 'should not execute',
          },
        ],
        (results) => results
      );

      expect(execution.status).toBe('failed');
      expect(execution.result).toEqual({ error: 'Step 2 failed' });
    });
  });

  describe('executeStep', () => {
    it('should execute a step successfully', async () => {
      const execution = createWorkflowExecution('test', 'lead-1', [
        { name: 'Step 1' },
      ]);

      const result = await executeStep(execution, 0, async () => {
        await delay(10);
        return { data: 'test' };
      });

      expect(result).toEqual({ data: 'test' });
      expect(execution.steps[0].status).toBe('completed');
      expect(execution.steps[0].result).toEqual({ data: 'test' });
    });

    it('should handle step errors', async () => {
      const execution = createWorkflowExecution('test', 'lead-1', [
        { name: 'Step 1' },
      ]);

      await expect(
        executeStep(execution, 0, async () => {
          throw new Error('Step error');
        })
      ).rejects.toThrow('Step error');

      expect(execution.steps[0].status).toBe('failed');
    });
  });

  describe('subscribeToWorkflow', () => {
    it('should notify listeners when workflow is updated', async () => {
      const updates: WorkflowExecution[] = [];
      const unsubscribe = subscribeToWorkflow((execution) => {
        updates.push(execution);
      });

      await executeWorkflow(
        'test',
        'lead-1',
        [
          { name: 'Step 1', execute: async () => 'result1' },
          { name: 'Step 2', execute: async () => 'result2' },
        ],
        (results) => results
      );

      unsubscribe();

      // Should receive updates: initial, step1 running, step1 completed, step2 running, step2 completed, workflow completed
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0].status).toBe('running');
      expect(updates[updates.length - 1].status).toBe('completed');
    });

    it('should unsubscribe correctly', () => {
      const updates: WorkflowExecution[] = [];
      const unsubscribe = subscribeToWorkflow((execution) => {
        updates.push(execution);
      });

      unsubscribe();

      createWorkflowExecution('test', 'lead-1', [{ name: 'Step 1' }]);

      // After unsubscribing, should not receive updates
      expect(updates.length).toBe(0);
    });
  });

  describe('getWorkflowExecution and getAllWorkflowExecutions', () => {
    it('should retrieve a workflow execution by ID', () => {
      const execution = createWorkflowExecution('test', 'lead-1', [
        { name: 'Step 1' },
      ]);

      const retrieved = getWorkflowExecution(execution.id);
      expect(retrieved).toEqual(execution);
    });

    it('should return undefined for non-existent execution', () => {
      const retrieved = getWorkflowExecution('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve all workflow executions', () => {
      // Clear any existing executions by creating a fresh set
      const exec1 = createWorkflowExecution('test1', 'lead-1', [
        { name: 'Step 1' },
      ]);
      const exec2 = createWorkflowExecution('test2', 'lead-2', [
        { name: 'Step 1' },
      ]);

      const allExecutions = getAllWorkflowExecutions();

      expect(allExecutions.length).toBeGreaterThanOrEqual(2);
      expect(allExecutions.find(e => e.id === exec1.id)).toBeDefined();
      expect(allExecutions.find(e => e.id === exec2.id)).toBeDefined();
    });
  });

  describe('delay', () => {
    it('should delay for the specified time', async () => {
      const start = Date.now();
      await delay(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(200); // Allow some margin
    });
  });
});
