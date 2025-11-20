import { LLMConfig } from '../types/llm-config';

const CONFIG_KEY = 'llm-config';

export function getStoredConfig(): LLMConfig | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error reading stored config:', error);
    return null;
  }
}

export function saveConfig(config: LLMConfig): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

export function clearConfig(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch (error) {
    console.error('Error clearing config:', error);
  }
}

export function getDefaultConfig(): LLMConfig {
  return {
    provider: 'openai',
    apiKey: '',
  };
}

// Note: Client-side cannot directly access server environment variables in Next.js
// Environment variables need NEXT_PUBLIC_ prefix for client-side access
// For server-side API routes, use process.env.OPENROUTER_API_KEY directly
