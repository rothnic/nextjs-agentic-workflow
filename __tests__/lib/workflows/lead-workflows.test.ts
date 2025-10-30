import { validateLead, enrichLead, scoreLead, processLead } from '@/lib/workflows/lead-workflows';
import { Lead } from '@/lib/types/workflow';

describe('Lead Workflows', () => {
  const mockLead: Lead = {
    id: 'test-lead-1',
    email: 'test@example.com',
    name: 'Test User',
    company: 'Test Company',
    phone: '+1234567890',
  };

  describe('validateLead', () => {
    it('should validate a lead with valid email', async () => {
      const execution = await validateLead(mockLead.id, mockLead);
      
      expect(execution.status).toBe('completed');
      expect(execution.workflowName).toBe('validate');
      expect(execution.steps).toHaveLength(3);
      expect(execution.steps.every(step => step.status === 'completed')).toBe(true);
    });

    it('should fail validation for invalid email', async () => {
      const invalidLead = { ...mockLead, email: 'invalid-email' };
      const execution = await validateLead(invalidLead.id, invalidLead);
      
      expect(execution.status).toBe('failed');
      expect(execution.steps[0].status).toBe('failed');
    });

    it('should track step timing', async () => {
      const execution = await validateLead(mockLead.id, mockLead);
      
      execution.steps.forEach(step => {
        if (step.status === 'completed' || step.status === 'failed') {
          expect(step.startTime).toBeDefined();
          expect(step.endTime).toBeDefined();
          expect(step.endTime!).toBeGreaterThan(step.startTime!);
        }
      });
    });
  });

  describe('enrichLead', () => {
    it('should enrich a lead with company data', async () => {
      const execution = await enrichLead(mockLead.id, mockLead);
      
      expect(execution.status).toBe('completed');
      expect(execution.workflowName).toBe('enrich');
      expect(execution.steps).toHaveLength(3);
      expect(execution.result).toBeDefined();
      
      const result = execution.result as Record<string, unknown>;
      expect(result.companyInfo).toBeDefined();
      expect(result.industry).toBe('Technology');
    });

    it('should complete all enrichment steps', async () => {
      const execution = await enrichLead(mockLead.id, mockLead);
      
      expect(execution.steps[0].name).toBe('Fetch Company Data');
      expect(execution.steps[1].name).toBe('Enrich Lead Profile');
      expect(execution.steps[2].name).toBe('Update Lead Record');
      expect(execution.steps.every(step => step.status === 'completed')).toBe(true);
    });
  });

  describe('scoreLead', () => {
    it('should score a lead based on available data', async () => {
      const execution = await scoreLead(mockLead.id, mockLead);
      
      expect(execution.status).toBe('completed');
      expect(execution.workflowName).toBe('score');
      
      const result = execution.result as { score: number; qualified: boolean };
      expect(result.score).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.qualified).toBeDefined();
    });

    it('should determine qualification based on score', async () => {
      const execution = await scoreLead(mockLead.id, mockLead);
      
      const result = execution.result as { score: number; qualified: boolean };
      expect(typeof result.qualified).toBe('boolean');
      
      // Score >= 60 should be qualified
      if (result.score >= 60) {
        expect(result.qualified).toBe(true);
      } else {
        expect(result.qualified).toBe(false);
      }
    });
  });

  describe('processLead', () => {
    it('should process a lead through all workflows', async () => {
      const execution = await processLead(mockLead.id, mockLead);
      
      expect(execution.status).toBe('completed');
      expect(execution.workflowName).toBe('process');
      expect(execution.steps).toHaveLength(3);
    });

    it('should include results from all sub-workflows', async () => {
      const execution = await processLead(mockLead.id, mockLead);
      
      const result = execution.result as Record<string, unknown>;
      expect(result.validation).toBeDefined();
      expect(result.enrichment).toBeDefined();
      expect(result.scoring).toBeDefined();
    });

    it('should fail if validation fails', async () => {
      const invalidLead = { ...mockLead, email: 'invalid-email' };
      const execution = await processLead(invalidLead.id, invalidLead);
      
      expect(execution.status).toBe('failed');
      expect(execution.steps[0].status).toBe('failed');
    });
  });

  describe('Workflow execution tracking', () => {
    it('should assign unique execution IDs', async () => {
      const execution1 = await validateLead(mockLead.id, mockLead);
      const execution2 = await validateLead(mockLead.id, mockLead);
      
      expect(execution1.id).not.toBe(execution2.id);
    });

    it('should track workflow duration', async () => {
      const execution = await validateLead(mockLead.id, mockLead);
      
      expect(execution.startTime).toBeDefined();
      expect(execution.endTime).toBeDefined();
      expect(execution.endTime!).toBeGreaterThan(execution.startTime);
    });

    it('should assign unique step IDs', async () => {
      const execution = await validateLead(mockLead.id, mockLead);
      
      const stepIds = execution.steps.map(step => step.id);
      const uniqueStepIds = new Set(stepIds);
      expect(uniqueStepIds.size).toBe(stepIds.length);
    });
  });
});
