'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import { getStoredConfig } from '@/lib/config/llm-storage';
import { LLMConfig } from '@/lib/types/llm-config';

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  state: string;
  result?: {
    message?: string;
    executionId?: string;
    success?: boolean;
  };
}

interface Message {
  id: string;
  role: string;
  content: string;
  toolInvocations?: ToolInvocation[];
}

interface ChatInterfaceProps {
  onWorkflowTriggered?: () => void;
}

export function ChatInterface({ onWorkflowTriggered }: ChatInterfaceProps) {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  useEffect(() => {
    const loadedConfig = getStoredConfig();
    setConfig(loadedConfig);
    setIsConfigLoaded(true);
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: config ? { config } : {},
    onToolCall: ({ toolCall }) => {
      // Trigger refresh when any workflow tool is called
      const workflowTools = ['validateLead', 'enrichLead', 'scoreLead', 'processLead', 'submitLead'];
      if (workflowTools.includes(toolCall.toolName)) {
        onWorkflowTriggered?.();
      }
    },
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Show loading state while config is being loaded
  if (!isConfigLoaded) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-semibold mb-2">Welcome to Lead Processing Agent</p>
            <p className="text-sm">Ask me to validate, enrich, score, or process leads.</p>
            <div className="mt-4 text-left max-w-md mx-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">Example commands:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Validate lead: john@example.com, John Doe, Acme Corp</li>
                <li>Enrich lead: jane@techcorp.com, Jane Smith, TechCorp</li>
                <li>Score lead: bob@startup.io, Bob Johnson, Startup Inc, +1234567890</li>
                <li>Process lead: alice@company.com, Alice Brown, Company LLC</li>
              </ul>
            </div>
          </div>
        )}
        
        {messages.map((message: Message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              
              {message.toolInvocations && message.toolInvocations.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.toolInvocations.map((toolInvocation: ToolInvocation) => (
                    <div
                      key={toolInvocation.toolCallId}
                      className="text-xs bg-white dark:bg-gray-900 rounded p-2 border border-gray-300 dark:border-gray-700"
                    >
                      <div className="font-semibold text-blue-600 dark:text-blue-400">
                        🔧 {toolInvocation.toolName}
                      </div>
                      {toolInvocation.state === 'result' && toolInvocation.result && (
                        <div className="mt-1">
                          <div className="text-gray-600 dark:text-gray-400">
                            {toolInvocation.result.message}
                          </div>
                          {toolInvocation.result.executionId && (
                            <div className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                              Execution ID: {toolInvocation.result.executionId}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 dark:bg-gray-800 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="border-t border-gray-300 dark:border-gray-700 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
