/**
 * API Route Tests for /api/chat
 *
 * Note: These tests verify the structure and configuration of the chat API endpoint.
 * Full integration testing with actual LLM calls would require live API keys.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

import { POST } from '@/app/api/chat/route';

// Mock the AI SDK
jest.mock('ai', () => ({
  streamText: jest.fn(() => ({
    toDataStreamResponse: jest.fn(() => new Response('mock response')),
  })),
  tool: jest.fn((config) => config),
}));

// Mock OpenAI SDK
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mock-openai-model'),
  createOpenAI: jest.fn(() => jest.fn(() => 'mock-custom-model')),
}));

// Mock workflow functions
jest.mock('@/lib/workflows/lead-workflows', () => ({
  validateLead: jest.fn(async () => ({
    id: 'exec-1',
    status: 'completed',
    result: { validated: true },
  })),
  enrichLead: jest.fn(async () => ({
    id: 'exec-2',
    status: 'completed',
    result: { companyInfo: 'Test Company' },
  })),
  scoreLead: jest.fn(async () => ({
    id: 'exec-3',
    status: 'completed',
    result: { score: 85, qualified: true },
  })),
  processLead: jest.fn(async () => ({
    id: 'exec-4',
    status: 'completed',
    result: { validation: {}, enrichment: {}, scoring: {} },
  })),
}));

// Mock lead storage
jest.mock('@/lib/storage/leads', () => ({
  submitLead: jest.fn(() => ({
    success: true,
    leadId: 'lead-123',
  })),
}));

describe('POST /api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle POST requests', async () => {
    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const response = await POST(request);

    expect(response).toBeInstanceOf(Response);
  });

  it('should use server config when no client config provided', async () => {
    const { streamText } = require('ai');

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test' }],
      }),
    });

    await POST(request);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.any(Array),
        tools: expect.any(Object),
        system: expect.stringContaining('lead processing assistant'),
      })
    );
  });

  it('should use client config when provided', async () => {
    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test' }],
        config: {
          provider: 'openai',
          apiKey: 'test-key',
        },
      }),
    });

    await POST(request);

    const { createOpenAI } = require('@ai-sdk/openai');
    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test-key',
      })
    );
  });

  it('should configure OpenRouter when specified', async () => {
    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test' }],
        config: {
          provider: 'openrouter',
          apiKey: 'openrouter-key',
          model: 'openai/gpt-3.5-turbo',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
      }),
    });

    await POST(request);

    const { createOpenAI } = require('@ai-sdk/openai');
    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'openrouter-key',
        baseURL: 'https://openrouter.ai/api/v1',
      })
    );
  });

  it('should include all workflow tools', async () => {
    const { streamText } = require('ai');

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test' }],
      }),
    });

    await POST(request);

    const call = streamText.mock.calls[0][0];
    expect(call.tools).toHaveProperty('validateLead');
    expect(call.tools).toHaveProperty('enrichLead');
    expect(call.tools).toHaveProperty('scoreLead');
    expect(call.tools).toHaveProperty('processLead');
    expect(call.tools).toHaveProperty('submitLead');
  });

  it('should have correct tool descriptions', async () => {
    const { streamText } = require('ai');

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test' }],
      }),
    });

    await POST(request);

    const call = streamText.mock.calls[0][0];
    expect(call.tools.validateLead.description).toContain('Validate a lead');
    expect(call.tools.enrichLead.description).toContain('Enrich a lead');
    expect(call.tools.scoreLead.description).toContain('Score a lead');
    expect(call.tools.processLead.description).toContain('Process a lead');
    expect(call.tools.submitLead.description).toContain('Submit a new lead');
  });

  it('should validate tool parameters with Zod', async () => {
    const { streamText } = require('ai');

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test' }],
      }),
    });

    await POST(request);

    const call = streamText.mock.calls[0][0];

    // Each tool should have parameters
    expect(call.tools.validateLead.parameters).toBeDefined();
    expect(call.tools.enrichLead.parameters).toBeDefined();
    expect(call.tools.scoreLead.parameters).toBeDefined();
    expect(call.tools.processLead.parameters).toBeDefined();
    expect(call.tools.submitLead.parameters).toBeDefined();
  });

  describe('Tool execution', () => {
    it('should execute validateLead tool', async () => {
      const { streamText } = require('ai');

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      await POST(request);

      const call = streamText.mock.calls[0][0];
      const result = await call.tools.validateLead.execute({
        leadId: 'lead-1',
        email: 'test@example.com',
        name: 'Test User',
        company: 'Test Company',
      });

      expect(result.success).toBe(true);
      expect(result.executionId).toBe('exec-1');
    });

    it('should execute submitLead tool and validate automatically', async () => {
      const { streamText } = require('ai');
      const { submitLead } = require('@/lib/storage/leads');
      const { validateLead } = require('@/lib/workflows/lead-workflows');

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      await POST(request);

      const call = streamText.mock.calls[0][0];
      const result = await call.tools.submitLead.execute({
        email: 'test@example.com',
        name: 'Test User',
        company: 'Test Company',
      });

      expect(submitLead).toHaveBeenCalled();
      expect(validateLead).toHaveBeenCalled();
      expect(result.leadId).toBe('lead-123');
      expect(result.executionId).toBe('exec-1');
    });
  });
});
