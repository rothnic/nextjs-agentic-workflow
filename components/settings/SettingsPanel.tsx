'use client';

import { useState, useEffect } from 'react';
import { LLMConfig, OpenRouterModel } from '@/lib/types/llm-config';
import { getStoredConfig, saveConfig, getDefaultConfig } from '@/lib/config/llm-storage';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<LLMConfig>(getDefaultConfig());
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = getStoredConfig();
    if (stored) {
      setConfig(stored);
      if (stored.provider === 'openrouter' && stored.apiKey) {
        fetchFreeModels(stored.apiKey);
      }
    }
  }, []);

  const fetchFreeModels = async (apiKey: string) => {
    setLoadingModels(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter for free models and sort by popularity
        const freeModels = data.data
          .filter((model: OpenRouterModel) => 
            model.pricing.prompt === '0' && model.pricing.completion === '0'
          )
          .slice(0, 20); // Top 20 free models
        setModels(freeModels);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleProviderChange = (provider: 'openai' | 'openrouter') => {
    setConfig({ ...config, provider, model: provider === 'openai' ? undefined : config.model });
    setModels([]);
  };

  const handleApiKeyChange = (apiKey: string) => {
    setConfig({ ...config, apiKey });
    if (config.provider === 'openrouter' && apiKey) {
      fetchFreeModels(apiKey);
    }
  };

  const handleSave = () => {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isValid = config.apiKey && (config.provider === 'openai' || config.model);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ⚙️ LLM Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Provider
              </label>
              <select
                value={config.provider}
                onChange={(e) => handleProviderChange(e.target.value as 'openai' | 'openrouter')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder={`Enter your ${config.provider === 'openai' ? 'OpenAI' : 'OpenRouter'} API key`}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                💾 Stored securely in your browser&apos;s local storage
              </p>
              {config.provider === 'openrouter' && (
                <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    💡 <strong>Tip:</strong> Set <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-xs">OPENROUTER_API_KEY</code> in your environment to avoid entering it each time.
                  </p>
                </div>
              )}
            </div>

            {/* OpenRouter Model Selection */}
            {config.provider === 'openrouter' && (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Model (Free only)
                </label>
                {loadingModels ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading free models...
                  </div>
                ) : models.length > 0 ? (
                  <>
                    <select
                      value={config.model || ''}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Select a free model</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      🆓 Showing top {models.length} free models. <a 
                        href="https://openrouter.ai/models?fmt=cards&max_price=0&order=top-weekly"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Browse all →
                      </a>
                    </p>
                  </>
                ) : config.apiKey ? (
                  <div className="text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    ⚠️ No models found. Please check your API key.
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    Enter your API key above to load available free models
                  </div>
                )}
              </div>
            )}

            {/* Base URL for OpenRouter */}
            {config.provider === 'openrouter' && (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Base URL
                </label>
                <input
                  type="text"
                  value={config.baseUrl || 'https://openrouter.ai/api/v1'}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
