import { Lead, WorkflowExecution } from '../types/workflow';
import {
  delay,
  createWorkflowExecution,
  executeStep,
  completeWorkflow,
  executeWorkflow,
  subscribeToWorkflow,
  getWorkflowExecution,
  getAllWorkflowExecutions,
} from './workflow-executor';

// Export subscription functions for external use
export { subscribeToWorkflow, getWorkflowExecution, getAllWorkflowExecutions };

// Increased delays to make workflow steps more visible (2-3 seconds per step)
const STEP_DELAYS = {
  short: 2000,   // 2 seconds
  medium: 2500,  // 2.5 seconds
  long: 3000,    // 3 seconds
};

// ============================================================================
// Individual Step Functions (Business Logic)
// ============================================================================

async function validateEmailStep(lead: Lead): Promise<{ valid: boolean; reason?: string }> {
  await delay(STEP_DELAYS.medium);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = emailRegex.test(lead.email);
  return {
    valid,
    reason: valid ? 'Email format is valid' : 'Invalid email format'
  };
}

async function validateDomainStep(email: string): Promise<{ valid: boolean; domain: string }> {
  await delay(STEP_DELAYS.short);
  const domain = email.split('@')[1] || '';
  // Simulate domain validation (in real app, would check DNS records)
  const valid = domain.length > 0;
  return { valid, domain };
}

async function enrichLeadStep(lead: Lead): Promise<Record<string, unknown>> {
  await delay(STEP_DELAYS.long);
  // Simulate enrichment with external data
  const mockEnrichment = {
    companyInfo: lead.company ? `${lead.company} is a technology company` : 'Unknown company',
    industry: 'Technology',
    companySize: '50-200 employees',
    location: 'San Francisco, CA'
  };
  return mockEnrichment;
}

async function scoreLeadStep(lead: Lead, enrichmentData: Record<string, unknown>): Promise<number> {
  await delay(STEP_DELAYS.medium);
  let score = 0;

  // Scoring logic
  if (lead.email && lead.email.includes('@')) score += 20;
  if (lead.name) score += 15;
  if (lead.company) score += 25;
  if (lead.phone) score += 10;
  if (enrichmentData?.companySize) score += 15;
  if (enrichmentData?.industry === 'Technology') score += 15;

  return Math.min(score, 100);
}

// ============================================================================
// Main Workflow Functions (Using DRY Executor Pattern)
// ============================================================================

export async function validateLead(leadId: string, lead: Lead): Promise<WorkflowExecution> {
  return executeWorkflow(
    'validate',
    leadId,
    [
      {
        name: 'Validate Email Format',
        execute: async () => {
          const result = await validateEmailStep(lead);
          if (!result.valid) {
            throw new Error(result.reason);
          }
          return result;
        },
      },
      {
        name: 'Validate Domain',
        execute: () => validateDomainStep(lead.email),
      },
      {
        name: 'Finalize Validation',
        execute: async () => {
          await delay(STEP_DELAYS.short);
          return { validated: true };
        },
      },
    ],
    (results) => ({
      validated: true,
      email: results[0],
      domain: results[1],
    })
  );
}

export async function enrichLead(leadId: string, lead: Lead): Promise<WorkflowExecution> {
  return executeWorkflow(
    'enrich',
    leadId,
    [
      {
        name: 'Fetch Company Data',
        execute: () => enrichLeadStep(lead),
      },
      {
        name: 'Enrich Lead Profile',
        execute: async () => {
          await delay(STEP_DELAYS.medium);
          return { enriched: true };
        },
      },
      {
        name: 'Update Lead Record',
        execute: async () => {
          await delay(STEP_DELAYS.short);
          return { updated: true };
        },
      },
    ],
    (results) => results[0] // Return enrichment data
  );
}

export async function scoreLead(leadId: string, lead: Lead): Promise<WorkflowExecution> {
  return executeWorkflow(
    'score',
    leadId,
    [
      {
        name: 'Gather Lead Data',
        execute: async () => {
          await delay(STEP_DELAYS.short);
          return lead.enrichmentDetails || {};
        },
      },
      {
        name: 'Calculate Score',
        execute: async function() {
          const enrichmentData = lead.enrichmentDetails || {};
          return { score: await scoreLeadStep(lead, enrichmentData) };
        },
      },
      {
        name: 'Determine Qualification',
        execute: async function(this: any) {
          await delay(STEP_DELAYS.short);
          // Get score from previous step's result
          const score = (arguments[0] as any)?.score || 0;
          const qualified = score >= 60;
          return { qualified, threshold: 60 };
        },
      },
    ],
    (results) => {
      const score = (results[1] as { score: number }).score;
      const qualified = score >= 60;
      return { score, qualified };
    }
  );
}

export async function processLead(leadId: string, lead: Lead): Promise<WorkflowExecution> {
  const execution = createWorkflowExecution('process', leadId, [
    { name: 'Validate Lead' },
    { name: 'Enrich Lead' },
    { name: 'Score Lead' },
  ]);

  try {
    // Step 1: Validate
    const validationResult = await executeStep(execution, 0, async () => {
      const result = await validateLead(leadId, lead);
      if (result.status === 'failed') {
        throw new Error('Lead validation failed');
      }
      return result.result;
    });

    // Step 2: Enrich
    const enrichmentResult = await executeStep(execution, 1, async () => {
      const result = await enrichLead(leadId, lead);
      return result.result;
    });

    // Step 3: Score
    const scoringResult = await executeStep(execution, 2, async () => {
      const result = await scoreLead(leadId, { ...lead, enrichmentDetails: enrichmentResult });
      return result.result;
    });

    completeWorkflow(execution, 'completed', {
      validation: validationResult,
      enrichment: enrichmentResult,
      scoring: scoringResult,
    });

  } catch (error) {
    completeWorkflow(execution, 'failed', { error: (error as Error).message });
  }

  return execution;
}
