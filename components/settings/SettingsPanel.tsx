'use client';

import { useState, useEffect } from 'react';
import { LLMConfig, OpenRouterModel } from '@/lib/types/llm-config';
import { getStoredConfig, saveConfig, getDefaultConfig } from '@/lib/config/llm-storage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader } from '@/components/ai-elements/loader';
import { ExternalLinkIcon } from 'lucide-react';

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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>LLM Settings</DialogTitle>
          <DialogDescription>
            Configure your AI provider and model preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={config.provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder={`Enter your ${config.provider === 'openai' ? 'OpenAI' : 'OpenRouter'} API key`}
            />
            <p className="text-xs text-muted-foreground">
              Stored securely in your browser&apos;s local storage
            </p>
          </div>

          {/* OpenRouter Model Selection */}
          {config.provider === 'openrouter' && (
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              {loadingModels ? (
                <Card className="p-4 flex items-center justify-center">
                  <Loader />
                  <span className="ml-2 text-sm text-muted-foreground">Loading free models...</span>
                </Card>
              ) : models.length > 0 ? (
                <>
                  <Select value={config.model || ''} onValueChange={(value) => setConfig({ ...config, model: value })}>
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {config.model && (
                    <p className="text-xs text-muted-foreground">
                      Free models only.{' '}
                      <a 
                        href="https://openrouter.ai/models?fmt=cards&max_price=0&order=top-weekly"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View all free models
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    </p>
                  )}
                </>
              ) : config.apiKey ? (
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    No models found. Check your API key.
                  </p>
                </Card>
              ) : (
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Enter API key to load models
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Base URL for OpenRouter */}
          {config.provider === 'openrouter' && (
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                type="text"
                value={config.baseUrl || 'https://openrouter.ai/api/v1'}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              />
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1"
          >
            {saved ? '✓ Saved' : 'Save Settings'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
