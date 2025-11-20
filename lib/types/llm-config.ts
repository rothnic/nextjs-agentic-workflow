export interface LLMConfig {
  provider: 'openai' | 'openrouter';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  top_provider?: {
    max_completion_tokens?: number;
  };
}
