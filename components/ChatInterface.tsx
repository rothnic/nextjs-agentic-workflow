'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useMemo } from 'react';
import { getStoredConfig } from '@/lib/config/llm-storage';
import { LLMConfig } from '@/lib/types/llm-config';

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  state: string;
  result?: {
    message?: string;
    executionId?: string;
    leadId?: string;
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

// Avatar component for better visual hierarchy
function Avatar({ role }: { role: string }) {
  return (
    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
      role === 'user' 
        ? 'bg-blue-600 text-white' 
        : 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
    }`}>
      {role === 'user' ? 'U' : 'AI'}
    </div>
  );
}

export function ChatInterface({ onWorkflowTriggered }: ChatInterfaceProps) {
  // Initialize config once on mount, using useMemo to avoid re-reads
  const config = useMemo<LLMConfig | null>(() => {
    if (typeof window !== 'undefined') {
      return getStoredConfig();
    }
    return null;
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    id: config ? `chat-${config.provider}-${config.model || 'default'}` : 'chat-default',
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
  
  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Welcome to Lead Processing Agent
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                I can help you validate, enrich, score, and process leads
              </p>
              <div className="inline-block text-left bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  💡 Example commands:
                </p>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-start">
                    <span className="text-blue-600 dark:text-blue-400 mr-2">→</span>
                    <span>Validate lead: john@example.com, John Doe, Acme Corp</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-purple-600 dark:text-purple-400 mr-2">→</span>
                    <span>Enrich lead: jane@techcorp.com, Jane Smith, TechCorp</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-600 dark:text-green-400 mr-2">→</span>
                    <span>Score lead: bob@startup.io, Bob Johnson, Startup Inc</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-orange-600 dark:text-orange-400 mr-2">→</span>
                    <span>Process lead: alice@company.com, Alice Brown, Company LLC</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message: Message) => (
            <div key={message.id} className="flex gap-3">
              <Avatar role={message.role} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {message.role === 'user' ? 'You' : 'Assistant'}
                  </span>
                </div>
                
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>
                
                {message.toolInvocations && message.toolInvocations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.toolInvocations.map((toolInvocation: ToolInvocation) => (
                      <div
                        key={toolInvocation.toolCallId}
                        className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-shrink-0 w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {toolInvocation.toolName}
                          </span>
                        </div>
                        
                        {toolInvocation.state === 'result' && toolInvocation.result && (
                          <div className="space-y-2 text-sm">
                            <p className="text-gray-700 dark:text-gray-300">
                              {toolInvocation.result.message}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs">
                              {toolInvocation.result.executionId && (
                                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Execution:</span>
                                  <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 rounded">
                                    {toolInvocation.result.executionId.slice(0, 8)}...
                                  </code>
                                </div>
                              )}
                              {toolInvocation.result.leadId && (
                                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Lead:</span>
                                  <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 rounded">
                                    {toolInvocation.result.leadId.slice(0, 8)}...
                                  </code>
                                </div>
                              )}
                              {toolInvocation.result.success !== undefined && (
                                <div className={`flex items-center gap-1 font-medium ${
                                  toolInvocation.result.success 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {toolInvocation.result.success ? (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Success
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      Failed
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {toolInvocation.state === 'call' && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex space-x-1">
                              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span>Executing...</span>
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
            <div className="flex gap-3">
              <Avatar role="assistant" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assistant</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder={isLoading ? "Agent is responding..." : "Send a message..."}
                disabled={isLoading}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white font-medium rounded-xl disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
