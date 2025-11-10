/**
 * Integration tests for end-to-end workflow execution
 * Tests the complete flow from submission to completion with status visibility
 */

import { validateLead, enrichLead, scoreLead, processLead } from '@/lib/workflows/lead-workflows';
import { subscribeToWorkflow, getAllWorkflowExecutions } from '@/lib/workflows/workflow-executor';
import { Lead, WorkflowExecution } from '@/lib/types/workflow';

// Increase timeout for integration tests since workflows have 2-3 second delays per step
jest.setTimeout(30000);

describe('Workflow Integration Tests', () => {
  const testLead: Lead = {
    id: 'integration-test-lead',
    email: 'integration@test.com',
    name: 'Integration Test User',
    company: 'Test Company Inc',
    phone: '+1234567890',
  };

  describe('Complete workflow lifecycle', () => {
    it('should execute validate workflow with visible step progression', async () => {
      const updates: WorkflowExecution[] = [];

      const unsubscribe = subscribeToWorkflow((execution) => {
        if (execution.leadId === testLead.id) {
          updates.push({ ...execution });
        }
      });

      const execution = await validateLead(testLead.id, testLead);

      unsubscribe();

      // Verify workflow completed
      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(3);

      // Verify all steps completed
      expect(execution.steps[0].name).toBe('Validate Email Format');
      expect(execution.steps[0].status).toBe('completed');
      expect(execution.steps[1].name).toBe('Validate Domain');
      expect(execution.steps[1].status).toBe('completed');
      expect(execution.steps[2].name).toBe('Finalize Validation');
      expect(execution.steps[2].status).toBe('completed');

      // Verify step timing (should be visible - at least 2 seconds per step)
      execution.steps.forEach((step) => {
        if (step.startTime && step.endTime) {
          const duration = step.endTime - step.startTime;
          expect(duration).toBeGreaterThanOrEqual(1500); // At least 1.5s allowing for some variance
        }
      });

      // Verify we received multiple status updates during execution
      expect(updates.length).toBeGreaterThan(0);

      // Should have updates showing progression through steps
      const runningUpdates = updates.filter(u =>
        u.steps.some(s => s.status === 'running')
      );
      expect(runningUpdates.length).toBeGreaterThan(0);
    });

    it('should execute enrich workflow with visible step progression', async () => {
      const execution = await enrichLead(testLead.id, testLead);

      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(3);
      expect(execution.steps[0].name).toBe('Fetch Company Data');
      expect(execution.steps[1].name).toBe('Enrich Lead Profile');
      expect(execution.steps[2].name).toBe('Update Lead Record');

      // Verify enrichment data
      const result = execution.result as Record<string, unknown>;
      expect(result.companyInfo).toBeDefined();
      expect(result.industry).toBe('Technology');
    });

    it('should execute score workflow with visible step progression', async () => {
      const execution = await scoreLead(testLead.id, testLead);

      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(3);
      expect(execution.steps[0].name).toBe('Gather Lead Data');
      expect(execution.steps[1].name).toBe('Calculate Score');
      expect(execution.steps[2].name).toBe('Determine Qualification');

      // Verify scoring results
      const result = execution.result as { score: number; qualified: boolean };
      expect(result.score).toBeGreaterThan(0);
      expect(result.qualified).toBeDefined();
    });

    it('should execute complete process workflow with all sub-workflows', async () => {
      const updates: WorkflowExecution[] = [];

      const unsubscribe = subscribeToWorkflow((execution) => {
        if (execution.workflowName === 'process' && execution.leadId === testLead.id) {
          updates.push({ ...execution });
        }
      });

      const execution = await processLead(testLead.id, testLead);

      unsubscribe();

      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(3);

      // Verify all steps completed
      expect(execution.steps[0].name).toBe('Validate Lead');
      expect(execution.steps[0].status).toBe('completed');
      expect(execution.steps[1].name).toBe('Enrich Lead');
      expect(execution.steps[1].status).toBe('completed');
      expect(execution.steps[2].name).toBe('Score Lead');
      expect(execution.steps[2].status).toBe('completed');

      // Verify combined results
      const result = execution.result as Record<string, unknown>;
      expect(result.validation).toBeDefined();
      expect(result.enrichment).toBeDefined();
      expect(result.scoring).toBeDefined();

      // Verify status updates were emitted
      expect(updates.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow visibility and tracking', () => {
    it('should track all workflow executions', async () => {
      const leadId = 'tracking-test-lead';

      await validateLead(leadId, { ...testLead, id: leadId });
      await enrichLead(leadId, { ...testLead, id: leadId });

      const allExecutions = getAllWorkflowExecutions();

      const validateExecution = allExecutions.find(
        e => e.leadId === leadId && e.workflowName === 'validate'
      );
      const enrichExecution = allExecutions.find(
        e => e.leadId === leadId && e.workflowName === 'enrich'
      );

      expect(validateExecution).toBeDefined();
      expect(enrichExecution).toBeDefined();
    });

    it('should provide real-time status updates during execution', async () => {
      const statusUpdates: { workflow: string; step: string; status: string }[] = [];

      const unsubscribe = subscribeToWorkflow((execution) => {
        execution.steps.forEach((step) => {
          if (step.status === 'running' || step.status === 'completed') {
            statusUpdates.push({
              workflow: execution.workflowName,
              step: step.name,
              status: step.status,
            });
          }
        });
      });

      await validateLead('realtime-test', { ...testLead, id: 'realtime-test' });

      unsubscribe();

      // Should have received status updates for each step
      const runningSteps = statusUpdates.filter(u => u.status === 'running');
      const completedSteps = statusUpdates.filter(u => u.status === 'completed');

      expect(runningSteps.length).toBeGreaterThan(0);
      expect(completedSteps.length).toBeGreaterThan(0);
    });

    it('should handle workflow failures gracefully', async () => {
      const invalidLead: Lead = {
        id: 'invalid-lead',
        email: 'invalid-email-format',
        name: 'Test',
      };

      const execution = await validateLead(invalidLead.id, invalidLead);

      expect(execution.status).toBe('failed');
      expect(execution.result).toHaveProperty('error');
    });

    it('should track step duration for performance monitoring', async () => {
      const execution = await validateLead('duration-test', {
        ...testLead,
        id: 'duration-test',
      });

      execution.steps.forEach((step) => {
        expect(step.startTime).toBeDefined();
        expect(step.endTime).toBeDefined();

        const duration = step.endTime! - step.startTime!;

        // Each step should take at least 1.5 seconds (allowing for variance)
        // to ensure visibility of progression
        expect(duration).toBeGreaterThanOrEqual(1500);
      });

      // Total workflow duration
      const totalDuration = execution.endTime! - execution.startTime;

      // Should take at least 6 seconds total for 3 steps (2s per step minimum)
      expect(totalDuration).toBeGreaterThanOrEqual(6000);
    });
  });

  describe('Error handling and recovery', () => {
    it('should stop processLead workflow if validation fails', async () => {
      const invalidLead: Lead = {
        id: 'process-fail-test',
        email: 'not-an-email',
        name: 'Test',
      };

      const execution = await processLead(invalidLead.id, invalidLead);

      expect(execution.status).toBe('failed');
      expect(execution.steps[0].status).toBe('failed');

      // Subsequent steps should not have been executed
      expect(execution.steps[1].status).toBe('pending');
      expect(execution.steps[2].status).toBe('pending');
    });

    it('should include error details in failed executions', async () => {
      const invalidLead: Lead = {
        id: 'error-detail-test',
        email: 'invalid',
        name: 'Test',
      };

      const execution = await validateLead(invalidLead.id, invalidLead);

      expect(execution.status).toBe('failed');
      const result = execution.result as { error: string };
      expect(result.error).toBeDefined();
      expect(result.error).toContain('email');
    });
  });
});
