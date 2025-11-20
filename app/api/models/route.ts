import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if OPENROUTER_API_KEY is available
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        models: [],
        hasServerKey: false 
      });
    }

    // Fetch available models from OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    
    // Filter for free models and extract relevant info
    const freeModels = data.data
      .filter((model: any) => 
        model.pricing.prompt === '0' && model.pricing.completion === '0'
      )
      .slice(0, 20) // Top 20 free models
      .map((model: any) => ({
        id: model.id,
        name: model.name,
      }));

    return NextResponse.json({
      models: freeModels,
      hasServerKey: true,
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ 
      models: [],
      hasServerKey: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
