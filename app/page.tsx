'use client';

import { useState, useCallback } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { WorkflowStatus } from '@/components/WorkflowStatus';
import { SettingsPanel } from '@/components/settings/SettingsPanel';

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleWorkflowTriggered = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Lead Processing Agent
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI-powered lead validation, enrichment, and scoring
              </p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Configure LLM settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </header>
        
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 bg-white dark:bg-gray-900">
            <ChatInterface onWorkflowTriggered={handleWorkflowTriggered} />
          </div>
          
          <div className="w-96 border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
            <WorkflowStatus refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
