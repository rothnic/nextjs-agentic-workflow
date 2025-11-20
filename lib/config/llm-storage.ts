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
  // Check for OPENROUTER_API_KEY in environment (for convenience)
  // Note: This only works on client-side if the env var is exposed with NEXT_PUBLIC_ prefix
  const openrouterKey = typeof window !== 'undefined' && (window as any).OPENROUTER_API_KEY;
  
  return {
    provider: openrouterKey ? 'openrouter' : 'openai',
    apiKey: openrouterKey || '',
  };
}

// Helper to get environment-based config hints for the settings UI
export function getEnvConfigHints(): { hasOpenRouterKey: boolean } {
  // This would need to be called from an API route to access server env vars
  return {
    hasOpenRouterKey: false, // Client-side can't access server env vars directly
  };
}
