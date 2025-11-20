'use client';

import { useChat } from 'ai/react';
import { useMemo } from 'react';
import { getStoredConfig } from '@/lib/config/llm-storage';
import { LLMConfig } from '@/lib/types/llm-config';
import { 
  Conversation, 
  ConversationContent, 
  ConversationEmptyState,
  ConversationScrollButton 
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { 
  PromptInput, 
  PromptInputTextarea, 
  PromptInputSubmit 
} from '@/components/ai-elements/prompt-input';
import { Tool, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool';
import { Loader } from '@/components/ai-elements/loader';
import { MessageSquareIcon } from 'lucide-react';

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  state: string;
  args?: any;
  result?: {
    message?: string;
    executionId?: string;
    leadId?: string;
    success?: boolean;
  };
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  toolInvocations?: ToolInvocation[];
}

interface ChatInterfaceProps {
  onWorkflowTriggered?: () => void;
}

export function ChatInterface({ onWorkflowTriggered }: ChatInterfaceProps) {
  // Initialize config once on mount, using useMemo to avoid re-reads
  const config = useMemo<LLMConfig | null>(() => {
    if (typeof window !== 'undefined') {
      return getStoredConfig();
    }
    return null;
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, status } = useChat({
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

  return (
    <div className="flex flex-col h-full">
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquareIcon className="size-12" />}
              title="Welcome to Lead Processing Agent"
              description="Ask me to validate, enrich, score, or process leads."
            >
              <div className="mt-6 text-left max-w-md bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">Example commands:</p>
                <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Validate lead: john@example.com, John Doe, Acme Corp</li>
                  <li>Enrich lead: jane@techcorp.com, Jane Smith, TechCorp</li>
                  <li>Score lead: bob@startup.io, Bob Johnson, Startup Inc, +1234567890</li>
                  <li>Process lead: alice@company.com, Alice Brown, Company LLC</li>
                </ul>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message: ChatMessage) => (
              <Message key={message.id} from={message.role as any}>
                <MessageContent>
                  {message.content && (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                  
                  {message.toolInvocations && message.toolInvocations.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.toolInvocations.map((toolInvocation: ToolInvocation) => {
                        // Map tool states to ai-elements compatible states
                        const mappedState = toolInvocation.state === 'result' 
                          ? 'output-available' 
                          : toolInvocation.state === 'call'
                          ? 'input-available'
                          : 'input-streaming';

                        return (
                          <Tool key={toolInvocation.toolCallId} defaultOpen>
                            <ToolHeader
                              title={toolInvocation.toolName}
                              type="tool-invocation"
                              state={mappedState as any}
                            />
                            {toolInvocation.args && (
                              <ToolInput input={toolInvocation.args} />
                            )}
                            {toolInvocation.result && (
                              <ToolOutput 
                                output={toolInvocation.result}
                                errorText={toolInvocation.result.success === false ? 'Tool execution failed' : undefined}
                              />
                            )}
                          </Tool>
                        );
                      })}
                    </div>
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          
          {isLoading && (
            <Message from="assistant">
              <MessageContent>
                <Loader />
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-4">
        <PromptInput 
          onSubmit={(message, event) => {
            event.preventDefault();
            // Create synthetic event for useChat
            const syntheticEvent = {
              preventDefault: () => {},
              target: { value: message.text }
            } as any;
            handleSubmit(syntheticEvent);
          }}
        >
          <PromptInputTextarea
            value={input}
            onChange={handleInputChange}
            placeholder={isLoading ? "Agent is responding..." : "Type a message..."}
            disabled={isLoading}
          />
          <PromptInputSubmit status={status as any} disabled={!input.trim() || isLoading} />
        </PromptInput>
      </div>
    </div>
  );
}
