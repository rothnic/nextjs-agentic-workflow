'use client';

import { useChat } from 'ai/react';
import { useMemo, useState, useEffect } from 'react';
import { getStoredConfig, saveConfig } from '@/lib/config/llm-storage';
import { LLMConfig } from '@/lib/types/llm-config';
import { 
  Conversation, 
  ConversationContent, 
  ConversationEmptyState,
  ConversationScrollButton 
} from '@/components/ai-elements/conversation';
import { 
  Message, 
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { 
  PromptInput,
  PromptInputHeader,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTextarea, 
  PromptInputSubmit,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputButton,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectValue,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { Tool, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool';
import { Loader } from '@/components/ai-elements/loader';
import { SubmitLeadDialog } from '@/components/lead/SubmitLeadDialog';
import { MessageSquareIcon, CopyIcon, RefreshCcwIcon, UserPlusIcon } from 'lucide-react';
import { nanoid } from 'nanoid';

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

interface ReasoningPart {
  type: 'reasoning';
  reasoning?: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  toolInvocations?: ToolInvocation[];
  experimental_data?: {
    reasoning?: ReasoningPart[];
  };
}

interface ChatInterfaceProps {
  onWorkflowTriggered?: () => void;
}

export function ChatInterface({ onWorkflowTriggered }: ChatInterfaceProps) {
  // State for models and lead dialog
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [hasServerKey, setHasServerKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showLeadDialog, setShowLeadDialog] = useState(false);

  // Initialize config once on mount, using useMemo to avoid re-reads
  const config = useMemo<LLMConfig | null>(() => {
    if (typeof window !== 'undefined') {
      return getStoredConfig();
    }
    return null;
  }, []);

  const [input, setInput] = useState('');

  // Fetch available models on mount
  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/models');
        const data = await response.json();
        
        setAvailableModels(data.models || []);
        setHasServerKey(data.hasServerKey);
        
        // Set default model if available
        if (data.models && data.models.length > 0) {
          setSelectedModel(data.models[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    }
    
    fetchModels();
  }, []);

  // Update config when model changes
  useEffect(() => {
    if (hasServerKey && selectedModel) {
      const newConfig: LLMConfig = {
        provider: 'openrouter',
        apiKey: 'use-server-key', // Special marker to use server-side key
        model: selectedModel,
        baseUrl: 'https://openrouter.ai/api/v1',
      };
      saveConfig(newConfig);
    }
  }, [selectedModel, hasServerKey]);

  const { messages, append, status, reload } = useChat({
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

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    
    if (!hasText) return;

    append({
      role: 'user',
      content: message.text,
    });

    setInput('');
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleRegenerate = () => {
    reload();
  };

  const handleLeadSubmit = (lead: { email: string; name: string; company?: string; phone?: string }) => {
    const leadId = nanoid();
    const message = `Process lead: ${lead.email}, ${lead.name}${lead.company ? `, ${lead.company}` : ''}${lead.phone ? `, ${lead.phone}` : ''}`;
    
    append({
      role: 'user',
      content: message,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <Conversation>
        <ConversationContent className="max-w-4xl mx-auto w-full px-4">
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
            messages.map((message: ChatMessage, index) => (
              <Message key={message.id} from={message.role as any}>
                <MessageContent>
                  {/* Show reasoning/thinking blocks if available */}
                  {message.experimental_data?.reasoning && message.experimental_data.reasoning.length > 0 && (
                    <Reasoning defaultOpen={false} className="mb-2">
                      <ReasoningTrigger />
                      <ReasoningContent>
                        {message.experimental_data.reasoning.map(r => r.reasoning).filter(Boolean).join('\n\n')}
                      </ReasoningContent>
                    </Reasoning>
                  )}
                  
                  {message.content && (
                    <MessageResponse>{message.content}</MessageResponse>
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
                          <Tool key={toolInvocation.toolCallId} defaultOpen={false}>
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
                
                {message.role === 'assistant' && message.content && (
                  <MessageActions>
                    <MessageAction
                      onClick={() => handleCopy(message.content)}
                      tooltip="Copy to clipboard"
                    >
                      <CopyIcon className="size-4" />
                    </MessageAction>
                    {index === messages.length - 1 && (
                      <MessageAction
                        onClick={handleRegenerate}
                        tooltip="Regenerate response"
                      >
                        <RefreshCcwIcon className="size-4" />
                      </MessageAction>
                    )}
                  </MessageActions>
                )}
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
        <PromptInput onSubmit={handleSubmit}>
          {hasServerKey && availableModels.length > 0 && (
            <PromptInputHeader>
              <PromptInputSelect value={selectedModel} onValueChange={setSelectedModel}>
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue placeholder="Select model" />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {availableModels.map((model) => (
                    <PromptInputSelectItem key={model.id} value={model.id}>
                      {model.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
              <PromptInputButton
                type="button"
                onClick={() => setShowLeadDialog(true)}
                variant="outline"
              >
                <UserPlusIcon className="size-4 mr-2" />
                Submit Lead
              </PromptInputButton>
            </PromptInputHeader>
          )}
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Agent is responding..." : "Type a message..."}
              disabled={isLoading}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <PromptInputSubmit status={status as any} disabled={!input.trim() || isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>

      <SubmitLeadDialog
        open={showLeadDialog}
        onOpenChange={setShowLeadDialog}
        onSubmit={handleLeadSubmit}
      />
    </div>
  );
}
