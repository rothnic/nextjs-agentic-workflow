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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              LLM Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Stored securely in your browser&apos;s local storage
              </p>
            </div>

            {/* OpenRouter Model Selection */}
            {config.provider === 'openrouter' && (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Model
                </label>
                {loadingModels ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Loading free models...
                  </div>
                ) : models.length > 0 ? (
                  <select
                    value={config.model || ''}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a model</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                ) : config.apiKey ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No models found. Check your API key.
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Enter API key to load models
                  </div>
                )}
                {config.model && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Free models only. <a 
                      href="https://openrouter.ai/models?fmt=cards&max_price=0&order=top-weekly"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View all free models
                    </a>
                  </p>
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
          <div className="mt-6 flex gap-2">
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saved ? '✓ Saved' : 'Save Settings'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
