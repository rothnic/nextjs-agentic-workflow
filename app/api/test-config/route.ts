import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * Test endpoint to validate LLM configuration
 * POST /api/test-config
 * Body: { provider: 'openrouter' | 'openai', apiKey: string, model?: string, baseUrl?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey: rawApiKey, model, baseUrl } = await req.json();

    console.log('[TestConfig] Testing configuration');
    console.log('[TestConfig] Provider:', provider);
    console.log('[TestConfig] Model:', model);
    console.log('[TestConfig] BaseURL:', baseUrl);
    console.log('[TestConfig] Raw API key length:', rawApiKey?.length);
    console.log('[TestConfig] Raw API key prefix:', rawApiKey?.substring(0, 20) + '...');

    if (!rawApiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Sanitize API key
    let apiKey = rawApiKey.trim();
    apiKey = apiKey.replace(/^OPENROUTER_API_KEY=/, '');
    apiKey = apiKey.replace(/^OPENAI_API_KEY=/, '');
    apiKey = apiKey.replace(/^["']|["']$/g, ''); // Remove quotes

    console.log('[TestConfig] Sanitized API key length:', apiKey.length);
    console.log('[TestConfig] Sanitized API key starts with:', apiKey.substring(0, 8));

    // Test creating the client
    let testModel;
    try {
      if (provider === 'openrouter') {
        const openrouter = createOpenAI({
          apiKey,
          baseURL: baseUrl || 'https://openrouter.ai/api/v1',
        });
        testModel = model || 'anthropic/claude-3.5-sonnet';
        const modelInstance = openrouter(testModel);
        console.log('[TestConfig] OpenRouter client created successfully');
        console.log('[TestConfig] Model instance:', typeof modelInstance);
      } else if (provider === 'openai') {
        const openai = createOpenAI({
          apiKey,
        });
        testModel = model || 'gpt-4-turbo';
        const modelInstance = openai(testModel);
        console.log('[TestConfig] OpenAI client created successfully');
        console.log('[TestConfig] Model instance:', typeof modelInstance);
      } else {
        return NextResponse.json(
          { success: false, error: `Unknown provider: ${provider}` },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Configuration is valid',
        details: {
          provider,
          model: testModel,
          baseUrl: provider === 'openrouter' ? (baseUrl || 'https://openrouter.ai/api/v1') : undefined,
          apiKeyLength: apiKey.length,
          apiKeyPrefix: apiKey.substring(0, 8) + '...'
        }
      });
    } catch (error) {
      console.error('[TestConfig] Error creating client:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create API client',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[TestConfig] Request error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 400 }
    );
  }
}
