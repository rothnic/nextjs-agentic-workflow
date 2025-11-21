'use client';

import { useState, useCallback } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { WorkflowStatus } from '@/components/WorkflowStatus';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SettingsIcon } from 'lucide-react';

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleWorkflowTriggered = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
        <header className="border-b bg-card">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                LP
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  Lead Processing Agent
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI-powered lead validation, enrichment, and scoring
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowSettings(true)}
              variant="outline"
              size="sm"
            >
              <SettingsIcon className="size-4 mr-2" />
              Settings
            </Button>
          </div>
        </header>
        
        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 bg-background overflow-hidden">
            <ChatInterface onWorkflowTriggered={handleWorkflowTriggered} />
          </div>
          
          <Separator orientation="vertical" />
          
          <div className="w-96 bg-card flex-shrink-0 overflow-hidden">
            <WorkflowStatus refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
