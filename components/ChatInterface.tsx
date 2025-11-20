'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useMemo } from 'react';
import { getStoredConfig } from '@/lib/config/llm-storage';
import { LLMConfig } from '@/lib/types/llm-config';
import { Send, Loader2, User, Bot, Wrench } from 'lucide-react';

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

export function ChatInterface({ onWorkflowTriggered }: ChatInterfaceProps) {
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
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Lead Processing Agent
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
              I can help you validate, enrich, score, and process leads. Just ask me what you need!
            </p>
            <div className="w-full max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { text: "Validate lead: john@example.com, John Doe, Acme Corp", icon: "✓" },
                  { text: "Enrich lead: jane@techcorp.com, Jane Smith, TechCorp", icon: "+" },
                  { text: "Score lead: bob@startup.io, Bob Johnson, Startup Inc", icon: "★" },
                  { text: "Process lead: alice@company.com, Alice Brown, Company LLC", icon: "⚡" }
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const event = {
                        preventDefault: () => {},
                        target: { value: example.text }
                      } as any;
                      handleInputChange(event);
                    }}
                    className="p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{example.icon}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{example.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.map((message: Message, index: number) => (
              <div
                key={message.id}
                className={`mb-8 flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
                
                <div className={`flex-1 ${message.role === 'user' ? 'max-w-[80%]' : ''}`}>
                  <div
                    className={`rounded-2xl px-5 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white ml-auto'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  </div>
                  
                  {/* Tool Invocations */}
                  {message.toolInvocations && message.toolInvocations.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.toolInvocations.map((tool: ToolInvocation) => (
                        <div
                          key={tool.toolCallId}
                          className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                              {tool.toolName}
                            </span>
                            {tool.state === 'call' && (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          
                          {tool.state === 'result' && tool.result && (
                            <div className="space-y-2 text-sm">
                              <p className="text-gray-700 dark:text-gray-300">
                                {tool.result.message}
                              </p>
                              <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                                {tool.result.executionId && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">Execution:</span>
                                    <code className="px-2 py-0.5 bg-gray-200 dark:bg-gray-900 rounded">
                                      {tool.result.executionId.slice(0, 8)}...
                                    </code>
                                  </div>
                                )}
                                {tool.result.leadId && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">Lead:</span>
                                    <code className="px-2 py-0.5 bg-gray-200 dark:bg-gray-900 rounded">
                                      {tool.result.leadId.slice(0, 8)}...
                                    </code>
                                  </div>
                                )}
                                {tool.result.success !== undefined && (
                                  <div className={`font-medium ${
                                    tool.result.success 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {tool.result.success ? '✓ Success' : '✗ Failed'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-700 dark:bg-gray-600 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="mb-8 flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="rounded-2xl px-5 py-3 bg-gray-100 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="Send a message..."
              disabled={isLoading}
              rows={1}
              className="w-full resize-none rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 pr-12 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ minHeight: '52px', maxHeight: '200px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
          <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
