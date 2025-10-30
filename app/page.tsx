import { ChatInterface } from '@/components/ChatInterface';
import { WorkflowStatus } from '@/components/WorkflowStatus';

export default function Home() {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 p-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Lead Processing Agent
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            AI-powered lead validation, enrichment, and scoring
          </p>
        </header>
        
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 bg-white dark:bg-gray-900">
            <ChatInterface />
          </div>
          
          <div className="w-96 border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
            <WorkflowStatus />
          </div>
        </div>
      </div>
    </div>
  );
}
