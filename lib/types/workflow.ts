export interface Lead {
  id: string;
  email: string;
  name: string;
  company?: string;
  phone?: string;
  source?: string;
  status?: 'new' | 'validated' | 'enriched' | 'scored' | 'qualified' | 'disqualified';
  score?: number;
  validationDetails?: {
    emailValid: boolean;
    domainValid: boolean;
  };
  enrichmentDetails?: {
    companyInfo?: string;
    industry?: string;
    companySize?: string;
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  result?: Record<string, unknown>;
  error?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowName: string;
  leadId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: WorkflowStep[];
  startTime: number;
  endTime?: number;
  result?: Record<string, unknown>;
}

export type WorkflowType = 'validate' | 'enrich' | 'score' | 'process';
