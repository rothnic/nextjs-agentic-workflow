import { openai } from '@ai-sdk/openai';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { submitLead } from '@/lib/storage/leads';
import { Lead } from '@/lib/types/workflow';
import { nanoid } from 'nanoid';
import { validateLead, enrichLead, scoreLead, processLead } from '@/lib/workflows/vercel-lead-workflows';
import {
  createWorkflowRun,
  updateWorkflowStatus,
  updateStepStatus,
} from '@/lib/workflows/workflow-tracking';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Helper to execute workflow directly with tracking
async function executeWorkflowWithTracking(
  workflowName: string,
  leadId: string,
  lead: Lead,
  stepNames: string[]
): Promise<{ success: boolean; runId: string; result?: unknown; error?: string }> {
  let runId: string | undefined;

  try {
    console.log(`[Workflow] Starting ${workflowName} for lead ${leadId}`);

    // Create workflow run for tracking
    const run = createWorkflowRun(workflowName, leadId, stepNames);
    runId = run.id;
    console.log(`[Workflow] Created run ${runId} for ${workflowName}`);

    // Mark as running
    updateWorkflowStatus(runId, 'running');
    updateStepStatus(runId, 0, 'running');

    // Execute the appropriate workflow
    let result: unknown;
    switch (workflowName) {
      case 'validate':
        console.log(`[Workflow] Executing validateLead for ${leadId}`);
        result = await validateLead(leadId, lead);
        break;
      case 'enrich':
        console.log(`[Workflow] Executing enrichLead for ${leadId}`);
        result = await enrichLead(leadId, lead);
        break;
      case 'score':
        console.log(`[Workflow] Executing scoreLead for ${leadId}`);
        result = await scoreLead(leadId, lead);
        break;
      case 'process':
        console.log(`[Workflow] Executing processLead for ${leadId}`);
        result = await processLead(leadId, lead);
        break;
      default:
        throw new Error(`Unknown workflow: ${workflowName}`);
    }

    // Mark all steps as completed
    for (let i = 0; i < stepNames.length; i++) {
      updateStepStatus(runId, i, 'completed');
    }

    // Mark workflow as completed
    updateWorkflowStatus(runId, 'completed', result);
    console.log(`[Workflow] Completed ${workflowName} for lead ${leadId} with run ${runId}`);

    return {
      success: true,
      runId,
      result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Workflow execution failed';
    console.error(`[Workflow] Error in ${workflowName} for lead ${leadId}:`, error);

    if (runId) {
      updateWorkflowStatus(runId, 'failed', undefined, errorMessage);
    }

    return {
      success: false,
      runId: runId || 'unknown',
      error: errorMessage,
    };
  }
}

// Configure LLM provider based on environment variables
function getModel() {
  const provider = process.env.LLM_PROVIDER || 'openai';
  
  if (provider === 'openrouter') {
    const openrouter = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    });
    
    const model = process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo';
    return openrouter(model);
  }
  
  // Default to OpenAI
  return openai('gpt-4-turbo');
}

export async function POST(req: Request) {
  try {
    const { messages, config } = await req.json();
    console.log('[Chat] Received chat request with config:', {
      provider: config?.provider,
      hasApiKey: !!config?.apiKey,
      model: config?.model
    });

    // Use client config if provided, otherwise use server config
    let model;
    if (config?.provider === 'openrouter' && config?.apiKey && config?.model) {
      // Sanitize API key - remove any env var prefix if present
      const apiKey = config.apiKey.replace(/^OPENROUTER_API_KEY=/, '');
      console.log('[Chat] Using OpenRouter with model:', config.model);
      const openrouter = createOpenAI({
        apiKey,
        baseURL: config.baseUrl || 'https://openrouter.ai/api/v1',
      });
      model = openrouter(config.model);
    } else if (config?.provider === 'openai' && config?.apiKey) {
      // Sanitize API key - remove any env var prefix if present
      const apiKey = config.apiKey.replace(/^OPENAI_API_KEY=/, '');
      console.log('[Chat] Using OpenAI');
      const clientOpenAI = createOpenAI({
        apiKey,
      });
      model = clientOpenAI('gpt-4-turbo');
    } else {
      console.log('[Chat] Using server-configured model');
      model = getModel();
    }

    const result = streamText({
      model,
      messages,
    tools: {
      validateLead: tool({
        description: 'Validate a lead by checking email format and domain validity. This workflow has 3 steps: validate email format, validate domain, and finalize validation.',
        parameters: z.object({
          leadId: z.string().describe('Unique identifier for the lead'),
          email: z.string().email().describe('Email address to validate'),
          name: z.string().describe('Name of the lead'),
          company: z.string().optional().describe('Company name'),
          phone: z.string().optional().describe('Phone number'),
        }),
        execute: async ({ leadId, email, name, company, phone }) => {
          const lead: Lead = {
            id: leadId,
            email,
            name,
            company,
            phone,
          };

          const result = await executeWorkflowWithTracking('validate', leadId, lead, [
            'Validate Email Format',
            'Validate Domain',
            'Finalize Validation',
          ]);

          return {
            success: result.success,
            runId: result.runId,
            result: result.result,
            message: result.success
              ? 'Lead validation workflow started'
              : `Validation failed: ${result.error}`,
          };
        },
      }),
      
      enrichLead: tool({
        description: 'Enrich a lead with additional company information and data. This workflow has 3 steps: fetch company data, enrich lead profile, and update lead record.',
        parameters: z.object({
          leadId: z.string().describe('Unique identifier for the lead'),
          email: z.string().email().describe('Email address'),
          name: z.string().describe('Name of the lead'),
          company: z.string().describe('Company name to enrich'),
        }),
        execute: async ({ leadId, email, name, company }) => {
          const lead: Lead = {
            id: leadId,
            email,
            name,
            company,
          };

          const result = await executeWorkflowWithTracking('enrich', leadId, lead, [
            'Fetch Company Data',
            'Enrich Lead Profile',
            'Update Lead Record',
          ]);

          return {
            success: result.success,
            runId: result.runId,
            result: result.result,
            message: result.success
              ? 'Lead enrichment workflow started'
              : `Enrichment failed: ${result.error}`,
          };
        },
      }),
      
      scoreLead: tool({
        description: 'Score a lead based on available data and determine if they are qualified. This workflow has 3 steps: gather lead data, calculate score, and determine qualification.',
        parameters: z.object({
          leadId: z.string().describe('Unique identifier for the lead'),
          email: z.string().email().describe('Email address'),
          name: z.string().describe('Name of the lead'),
          company: z.string().optional().describe('Company name'),
          phone: z.string().optional().describe('Phone number'),
          enrichmentDetails: z.object({
            companyInfo: z.string().optional(),
            industry: z.string().optional(),
            companySize: z.string().optional(),
          }).optional().describe('Previously enriched data about the lead'),
        }),
        execute: async ({ leadId, email, name, company, phone, enrichmentDetails }) => {
          const lead: Lead = {
            id: leadId,
            email,
            name,
            company,
            phone,
            enrichmentDetails,
          };

          const result = await executeWorkflowWithTracking('score', leadId, lead, [
            'Gather Lead Data',
            'Calculate Score',
            'Determine Qualification',
          ]);
          const scoreData = result.result as { score?: number; qualified?: boolean } | undefined;

          return {
            success: result.success,
            runId: result.runId,
            result: result.result,
            message: result.success && scoreData?.score !== undefined
              ? `Lead scored: ${scoreData.score}/100 (${scoreData.qualified ? 'Qualified' : 'Not qualified'})`
              : `Scoring failed: ${result.error}`,
          };
        },
      }),
      
      processLead: tool({
        description: 'Process a lead through the complete workflow: validate, enrich, and score. This is a comprehensive workflow with multiple steps.',
        parameters: z.object({
          leadId: z.string().describe('Unique identifier for the lead'),
          email: z.string().email().describe('Email address'),
          name: z.string().describe('Name of the lead'),
          company: z.string().optional().describe('Company name'),
          phone: z.string().optional().describe('Phone number'),
          source: z.string().optional().describe('Lead source'),
        }),
        execute: async ({ leadId, email, name, company, phone, source }) => {
          const lead: Lead = {
            id: leadId,
            email,
            name,
            company,
            phone,
            source,
          };

          const result = await executeWorkflowWithTracking('process', leadId, lead, [
            'Validate Lead',
            'Enrich Lead',
            'Score Lead',
          ]);

          return {
            success: result.success,
            runId: result.runId,
            result: result.result,
            message: result.success
              ? 'Lead processing workflow started (validate, enrich, score)'
              : `Processing failed: ${result.error}`,
          };
        },
      }),
      
      submitLead: tool({
        description: 'Submit a new lead to the system. Use this when a user wants to add or create a new lead. This will also validate the lead automatically.',
        parameters: z.object({
          email: z.string().email().describe('Email address'),
          name: z.string().describe('Name of the lead'),
          company: z.string().optional().describe('Company name'),
          phone: z.string().optional().describe('Phone number'),
          source: z.string().optional().describe('Lead source (e.g., website, referral, event)'),
        }),
        execute: async ({ email, name, company, phone, source }) => {
          const leadId = nanoid();
          const lead: Lead = {
            id: leadId,
            email,
            name,
            company,
            phone,
            source,
            status: 'new',
          };

          // Submit the lead to storage
          const storageResult = submitLead(lead);

          // Automatically validate the submitted lead via workflow
          const workflowResult = await executeWorkflowWithTracking('validate', leadId, lead, [
            'Validate Email Format',
            'Validate Domain',
            'Finalize Validation',
          ]);

          return {
            success: storageResult.success && workflowResult.success,
            leadId: storageResult.leadId,
            runId: workflowResult.runId,
            message: workflowResult.success
              ? `Lead ${name} (${email}) submitted and validation workflow started`
              : `Lead submitted but validation failed: ${workflowResult.error}`,
            lead,
          };
        },
      }),
    },
    system: `You are a helpful lead processing assistant. You can help validate, enrich, score, process, and submit leads.
    
When users provide lead information, you can:
- Submit new leads to the system
- Validate leads to check email format and domain validity
- Enrich leads with additional company information
- Score leads based on available data to determine qualification
- Process leads through the complete workflow (validate, enrich, score)

Each workflow execution happens in multiple steps, and users can track the progress in real-time through the UI.

Always be clear about what action you're taking and what the results mean.`,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[Chat] Error in POST handler:', error);
    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
