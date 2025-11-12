import { openai } from '@ai-sdk/openai';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { submitLead } from '@/lib/storage/leads';
import { Lead } from '@/lib/types/workflow';
import { nanoid } from 'nanoid';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Get the base URL for API calls (works in both dev and production)
function getBaseUrl(): string {
  // In production on Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // In development
  return 'http://localhost:3000';
}

// Helper to trigger workflow via API with dynamic URL
async function triggerWorkflow(
  workflowName: string,
  leadId: string,
  lead: Lead
): Promise<{ success: boolean; runId?: string; result?: unknown; error?: string }> {
  try {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/workflows/${workflowName}`;

    console.log(`[Workflow] Triggering ${workflowName} at ${url}`);

    // Prepare headers with Vercel deployment protection bypass if available
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Vercel automation bypass secret if available (for deployment protection)
    // This allows server-side requests to bypass authentication when deployed on Vercel
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      console.log(`[Workflow] Using Vercel automation bypass for internal request`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ leadId, lead }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Workflow request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log(`[Workflow] ${workflowName} triggered successfully:`, result);
    return result;
  } catch (error) {
    console.error(`[Workflow] Error triggering ${workflowName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Workflow trigger failed',
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
    console.log('[Chat] Received chat request');
    console.log('[Chat] Config:', JSON.stringify({
      provider: config?.provider,
      hasApiKey: !!config?.apiKey,
      apiKeyPrefix: config?.apiKey?.substring(0, 20) + '...',
      model: config?.model,
      baseUrl: config?.baseUrl
    }, null, 2));
    console.log('[Chat] Messages count:', messages?.length);

    // Use client config if provided, otherwise use server config
    let model;
    try {
      if (config?.provider === 'openrouter' && config?.apiKey && config?.model) {
        // Sanitize API key - remove any env var prefix if present
        let apiKey = config.apiKey.trim();
        apiKey = apiKey.replace(/^OPENROUTER_API_KEY=/, '');
        apiKey = apiKey.replace(/^["']|["']$/g, ''); // Remove quotes

        console.log('[Chat] Using OpenRouter');
        console.log('[Chat] Model:', config.model);
        console.log('[Chat] API key length after sanitization:', apiKey.length);
        console.log('[Chat] API key starts with:', apiKey.substring(0, 8));

        const openrouter = createOpenAI({
          apiKey,
          baseURL: config.baseUrl || 'https://openrouter.ai/api/v1',
        });
        model = openrouter(config.model);
        console.log('[Chat] OpenRouter model created successfully');
      } else if (config?.provider === 'openai' && config?.apiKey) {
        // Sanitize API key - remove any env var prefix if present
        let apiKey = config.apiKey.trim();
        apiKey = apiKey.replace(/^OPENAI_API_KEY=/, '');
        apiKey = apiKey.replace(/^["']|["']$/g, ''); // Remove quotes

        console.log('[Chat] Using OpenAI');
        console.log('[Chat] API key length after sanitization:', apiKey.length);

        const clientOpenAI = createOpenAI({
          apiKey,
        });
        model = clientOpenAI('gpt-4-turbo');
        console.log('[Chat] OpenAI model created successfully');
      } else {
        console.log('[Chat] Using server-configured model');
        model = getModel();
      }
    } catch (modelError) {
      console.error('[Chat] Error creating model:', modelError);
      console.error('[Chat] Model error stack:', modelError instanceof Error ? modelError.stack : 'No stack');
      throw new Error(`Failed to create model: ${modelError instanceof Error ? modelError.message : 'Unknown error'}`);
    }

    console.log('[Chat] Starting streamText...');
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

          const result = await triggerWorkflow('validate-lead', leadId, lead);

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

          const result = await triggerWorkflow('enrich-lead', leadId, lead);

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

          const result = await triggerWorkflow('score-lead', leadId, lead);
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

          const result = await triggerWorkflow('process-lead', leadId, lead);

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
          const workflowResult = await triggerWorkflow('validate-lead', leadId, lead);

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

    console.log('[Chat] streamText created, returning response');
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[Chat] ==================== ERROR ====================');
    console.error('[Chat] Error in POST handler:', error);
    console.error('[Chat] Error type:', typeof error);
    console.error('[Chat] Error name:', error instanceof Error ? error.name : 'Not an Error object');
    console.error('[Chat] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Chat] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[Chat] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('[Chat] ==================================================');

    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : typeof error
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
