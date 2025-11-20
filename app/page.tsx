'use client';

import { useState, useCallback } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { WorkflowStatus } from '@/components/WorkflowStatus';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { Settings2, PanelRightClose, PanelRightOpen } from 'lucide-react';

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showWorkflows, setShowWorkflows] = useState(true);

  const handleWorkflowTriggered = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Lead Processing Agent
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWorkflows(!showWorkflows)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={showWorkflows ? "Hide workflow panel" : "Show workflow panel"}
              >
                {showWorkflows ? (
                  <PanelRightClose className="w-5 h-5" />
                ) : (
                  <PanelRightOpen className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Settings"
              >
                <Settings2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
        
        {/* Chat Interface */}
        <ChatInterface onWorkflowTriggered={handleWorkflowTriggered} />
      </div>

      {/* Workflow Panel */}
      {showWorkflows && (
        <div className="w-96 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <WorkflowStatus refreshTrigger={refreshTrigger} />
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
