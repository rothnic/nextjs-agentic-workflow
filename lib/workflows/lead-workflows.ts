import { Lead, WorkflowExecution } from '../types/workflow';
import { nanoid } from 'nanoid';

// Simulated delay to make workflow steps visible
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

// Workflow step implementations
async function validateEmailStep(lead: Lead): Promise<{ valid: boolean; reason?: string }> {
  await delay(800);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = emailRegex.test(lead.email);
  return {
    valid,
    reason: valid ? 'Email format is valid' : 'Invalid email format'
  };
}

async function validateDomainStep(email: string): Promise<{ valid: boolean; domain: string }> {
  await delay(600);
  const domain = email.split('@')[1] || '';
  // Simulate domain validation (in real app, would check DNS records)
  const valid = domain.length > 0;
  return { valid, domain };
}

async function enrichLeadStep(lead: Lead): Promise<Record<string, unknown>> {
  await delay(1200);
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
  await delay(900);
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

// Main workflow functions
export async function validateLead(leadId: string, lead: Lead): Promise<WorkflowExecution> {
  const executionId = nanoid();
  const execution: WorkflowExecution = {
    id: executionId,
    workflowName: 'validate',
    leadId,
    status: 'running',
    steps: [
      { id: nanoid(), name: 'Validate Email Format', status: 'pending' },
      { id: nanoid(), name: 'Validate Domain', status: 'pending' },
      { id: nanoid(), name: 'Finalize Validation', status: 'pending' }
    ],
    startTime: Date.now()
  };
  
  workflowExecutions.set(executionId, execution);
  notifyListeners(execution);
  
  try {
    // Step 1: Validate email format
    execution.steps[0].status = 'running';
    execution.steps[0].startTime = Date.now();
    notifyListeners(execution);
    
    const emailValidation = await validateEmailStep(lead);
    execution.steps[0].status = emailValidation.valid ? 'completed' : 'failed';
    execution.steps[0].endTime = Date.now();
    execution.steps[0].result = emailValidation;
    notifyListeners(execution);
    
    if (!emailValidation.valid) {
      throw new Error(emailValidation.reason);
    }
    
    // Step 2: Validate domain
    execution.steps[1].status = 'running';
    execution.steps[1].startTime = Date.now();
    notifyListeners(execution);
    
    const domainValidation = await validateDomainStep(lead.email);
    execution.steps[1].status = domainValidation.valid ? 'completed' : 'failed';
    execution.steps[1].endTime = Date.now();
    execution.steps[1].result = domainValidation;
    notifyListeners(execution);
    
    // Step 3: Finalize
    execution.steps[2].status = 'running';
    execution.steps[2].startTime = Date.now();
    notifyListeners(execution);
    
    await delay(400);
    execution.steps[2].status = 'completed';
    execution.steps[2].endTime = Date.now();
    execution.steps[2].result = { validated: true };
    notifyListeners(execution);
    
    execution.status = 'completed';
    execution.endTime = Date.now();
    execution.result = {
      validated: true,
      email: emailValidation,
      domain: domainValidation
    };
    
  } catch (error) {
    execution.status = 'failed';
    execution.endTime = Date.now();
    execution.result = { error: (error as Error).message };
  }
  
  notifyListeners(execution);
  return execution;
}

export async function enrichLead(leadId: string, lead: Lead): Promise<WorkflowExecution> {
  const executionId = nanoid();
  const execution: WorkflowExecution = {
    id: executionId,
    workflowName: 'enrich',
    leadId,
    status: 'running',
    steps: [
      { id: nanoid(), name: 'Fetch Company Data', status: 'pending' },
      { id: nanoid(), name: 'Enrich Lead Profile', status: 'pending' },
      { id: nanoid(), name: 'Update Lead Record', status: 'pending' }
    ],
    startTime: Date.now()
  };
  
  workflowExecutions.set(executionId, execution);
  notifyListeners(execution);
  
  try {
    // Step 1: Fetch company data
    execution.steps[0].status = 'running';
    execution.steps[0].startTime = Date.now();
    notifyListeners(execution);
    
    const enrichmentData = await enrichLeadStep(lead);
    execution.steps[0].status = 'completed';
    execution.steps[0].endTime = Date.now();
    execution.steps[0].result = enrichmentData;
    notifyListeners(execution);
    
    // Step 2: Enrich profile
    execution.steps[1].status = 'running';
    execution.steps[1].startTime = Date.now();
    notifyListeners(execution);
    
    await delay(700);
    execution.steps[1].status = 'completed';
    execution.steps[1].endTime = Date.now();
    execution.steps[1].result = { enriched: true };
    notifyListeners(execution);
    
    // Step 3: Update record
    execution.steps[2].status = 'running';
    execution.steps[2].startTime = Date.now();
    notifyListeners(execution);
    
    await delay(500);
    execution.steps[2].status = 'completed';
    execution.steps[2].endTime = Date.now();
    execution.steps[2].result = { updated: true };
    notifyListeners(execution);
    
    execution.status = 'completed';
    execution.endTime = Date.now();
    execution.result = enrichmentData;
    
  } catch (error) {
    execution.status = 'failed';
    execution.endTime = Date.now();
    execution.result = { error: (error as Error).message };
  }
  
  notifyListeners(execution);
  return execution;
}

export async function scoreLead(leadId: string, lead: Lead): Promise<WorkflowExecution> {
  const executionId = nanoid();
  const execution: WorkflowExecution = {
    id: executionId,
    workflowName: 'score',
    leadId,
    status: 'running',
    steps: [
      { id: nanoid(), name: 'Gather Lead Data', status: 'pending' },
      { id: nanoid(), name: 'Calculate Score', status: 'pending' },
      { id: nanoid(), name: 'Determine Qualification', status: 'pending' }
    ],
    startTime: Date.now()
  };
  
  workflowExecutions.set(executionId, execution);
  notifyListeners(execution);
  
  try {
    // Step 1: Gather data
    execution.steps[0].status = 'running';
    execution.steps[0].startTime = Date.now();
    notifyListeners(execution);
    
    await delay(600);
    const enrichmentData = lead.enrichmentDetails || {};
    execution.steps[0].status = 'completed';
    execution.steps[0].endTime = Date.now();
    execution.steps[0].result = enrichmentData;
    notifyListeners(execution);
    
    // Step 2: Calculate score
    execution.steps[1].status = 'running';
    execution.steps[1].startTime = Date.now();
    notifyListeners(execution);
    
    const score = await scoreLeadStep(lead, enrichmentData);
    execution.steps[1].status = 'completed';
    execution.steps[1].endTime = Date.now();
    execution.steps[1].result = { score };
    notifyListeners(execution);
    
    // Step 3: Determine qualification
    execution.steps[2].status = 'running';
    execution.steps[2].startTime = Date.now();
    notifyListeners(execution);
    
    await delay(500);
    const qualified = score >= 60;
    execution.steps[2].status = 'completed';
    execution.steps[2].endTime = Date.now();
    execution.steps[2].result = { qualified, threshold: 60 };
    notifyListeners(execution);
    
    execution.status = 'completed';
    execution.endTime = Date.now();
    execution.result = { score, qualified };
    
  } catch (error) {
    execution.status = 'failed';
    execution.endTime = Date.now();
    execution.result = { error: (error as Error).message };
  }
  
  notifyListeners(execution);
  return execution;
}

export async function processLead(leadId: string, lead: Lead): Promise<WorkflowExecution> {
  const executionId = nanoid();
  const execution: WorkflowExecution = {
    id: executionId,
    workflowName: 'process',
    leadId,
    status: 'running',
    steps: [
      { id: nanoid(), name: 'Validate Lead', status: 'pending' },
      { id: nanoid(), name: 'Enrich Lead', status: 'pending' },
      { id: nanoid(), name: 'Score Lead', status: 'pending' }
    ],
    startTime: Date.now()
  };
  
  workflowExecutions.set(executionId, execution);
  notifyListeners(execution);
  
  try {
    // Step 1: Validate
    execution.steps[0].status = 'running';
    execution.steps[0].startTime = Date.now();
    notifyListeners(execution);
    
    const validationResult = await validateLead(leadId, lead);
    execution.steps[0].status = validationResult.status === 'completed' ? 'completed' : 'failed';
    execution.steps[0].endTime = Date.now();
    execution.steps[0].result = validationResult.result;
    notifyListeners(execution);
    
    if (validationResult.status === 'failed') {
      throw new Error('Lead validation failed');
    }
    
    // Step 2: Enrich
    execution.steps[1].status = 'running';
    execution.steps[1].startTime = Date.now();
    notifyListeners(execution);
    
    const enrichmentResult = await enrichLead(leadId, lead);
    execution.steps[1].status = enrichmentResult.status === 'completed' ? 'completed' : 'failed';
    execution.steps[1].endTime = Date.now();
    execution.steps[1].result = enrichmentResult.result;
    notifyListeners(execution);
    
    // Step 3: Score
    execution.steps[2].status = 'running';
    execution.steps[2].startTime = Date.now();
    notifyListeners(execution);
    
    const scoringResult = await scoreLead(leadId, { ...lead, enrichmentDetails: enrichmentResult.result });
    execution.steps[2].status = scoringResult.status === 'completed' ? 'completed' : 'failed';
    execution.steps[2].endTime = Date.now();
    execution.steps[2].result = scoringResult.result;
    notifyListeners(execution);
    
    execution.status = 'completed';
    execution.endTime = Date.now();
    execution.result = {
      validation: validationResult.result,
      enrichment: enrichmentResult.result,
      scoring: scoringResult.result
    };
    
  } catch (error) {
    execution.status = 'failed';
    execution.endTime = Date.now();
    execution.result = { error: (error as Error).message };
  }
  
  notifyListeners(execution);
  return execution;
}

export function getWorkflowExecution(id: string): WorkflowExecution | undefined {
  return workflowExecutions.get(id);
}

export function getAllWorkflowExecutions(): WorkflowExecution[] {
  return Array.from(workflowExecutions.values());
}
