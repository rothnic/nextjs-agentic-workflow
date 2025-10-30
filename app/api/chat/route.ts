import { openai } from '@ai-sdk/openai';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { validateLead, enrichLead, scoreLead, processLead } from '@/lib/workflows/lead-workflows';
import { Lead } from '@/lib/types/workflow';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

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
  const { messages, config } = await req.json();

  // Use client config if provided, otherwise use server config
  let model;
  if (config?.provider === 'openrouter' && config?.apiKey && config?.model) {
    const openrouter = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://openrouter.ai/api/v1',
    });
    model = openrouter(config.model);
  } else if (config?.provider === 'openai' && config?.apiKey) {
    const clientOpenAI = createOpenAI({
      apiKey: config.apiKey,
    });
    model = clientOpenAI('gpt-4-turbo');
  } else {
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
          
          const execution = await validateLead(leadId, lead);
          
          return {
            success: execution.status === 'completed',
            executionId: execution.id,
            result: execution.result,
            message: execution.status === 'completed' 
              ? 'Lead validated successfully' 
              : 'Lead validation failed',
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
          
          const execution = await enrichLead(leadId, lead);
          
          return {
            success: execution.status === 'completed',
            executionId: execution.id,
            result: execution.result,
            message: execution.status === 'completed'
              ? 'Lead enriched successfully'
              : 'Lead enrichment failed',
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
          
          const execution = await scoreLead(leadId, lead);
          const result = execution.result as { score?: number; qualified?: boolean } | undefined;
          
          return {
            success: execution.status === 'completed',
            executionId: execution.id,
            result: execution.result,
            message: execution.status === 'completed' && result?.score !== undefined
              ? `Lead scored: ${result.score}/100 (${result.qualified ? 'Qualified' : 'Not qualified'})`
              : 'Lead scoring failed',
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
          
          const execution = await processLead(leadId, lead);
          
          return {
            success: execution.status === 'completed',
            executionId: execution.id,
            result: execution.result,
            message: execution.status === 'completed'
              ? 'Lead processed successfully through all workflows'
              : 'Lead processing failed',
          };
        },
      }),
    },
    system: `You are a helpful lead processing assistant. You can help validate, enrich, score, and process leads through various workflows.
    
When users provide lead information, you can:
- Validate leads to check email format and domain validity
- Enrich leads with additional company information
- Score leads based on available data to determine qualification
- Process leads through the complete workflow (validate, enrich, score)

Each workflow execution happens in multiple steps, and users can track the progress in real-time through the UI.

Always be clear about what workflow you're executing and what the results mean.`,
  });

  return result.toDataStreamResponse();
}
