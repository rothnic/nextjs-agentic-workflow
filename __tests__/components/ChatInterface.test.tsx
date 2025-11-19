import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '@/components/ChatInterface';

// Mock the AI SDK's useChat hook
jest.mock('ai/react', () => ({
  useChat: jest.fn(() => ({
    messages: [],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
  })),
}));

// Mock the config storage
jest.mock('@/lib/config/llm-storage', () => ({
  getStoredConfig: jest.fn(() => ({
    provider: 'openai',
    apiKey: 'test-key',
  })),
}));

describe('ChatInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the chat interface', async () => {
    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome to Lead Processing Agent/i)).toBeInTheDocument();
    });
  });

  it('should display example commands when no messages exist', async () => {
    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByText(/Example commands:/i)).toBeInTheDocument();
      expect(screen.getByText(/Validate lead:/i)).toBeInTheDocument();
      expect(screen.getByText(/Enrich lead:/i)).toBeInTheDocument();
    });
  });

  it('should render input field and send button', async () => {
    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type a message.../i)).toBeInTheDocument();
      expect(screen.getByText(/Send/i)).toBeInTheDocument();
    });
  });

  it('should show loading state while config is loading', () => {
    // Override the mock to simulate loading state
    const { getStoredConfig } = require('@/lib/config/llm-storage');
    getStoredConfig.mockReturnValue(null);

    const { container } = render(<ChatInterface />);

    // During initial render, before useEffect completes
    expect(container.textContent).toContain('Loading...');
  });

  it('should display user messages correctly', async () => {
    const { useChat } = require('ai/react');
    useChat.mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'Test message',
        },
      ],
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
    });

    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should display assistant messages correctly', async () => {
    const { useChat } = require('ai/react');
    useChat.mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Assistant response',
        },
      ],
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
    });

    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByText('Assistant response')).toBeInTheDocument();
    });
  });

  it('should display tool invocations', async () => {
    const { useChat } = require('ai/react');
    useChat.mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Processing lead...',
          toolInvocations: [
            {
              toolCallId: 'call-1',
              toolName: 'validateLead',
              state: 'result',
              result: {
                success: true,
                message: 'Lead validated successfully',
                executionId: 'exec-123',
                leadId: 'lead-456',
              },
            },
          ],
        },
      ],
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
    });

    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByText('🔧 validateLead')).toBeInTheDocument();
      expect(screen.getByText('Lead validated successfully')).toBeInTheDocument();
      expect(screen.getByText(/Execution ID: exec-123/i)).toBeInTheDocument();
      expect(screen.getByText(/Lead ID: lead-456/i)).toBeInTheDocument();
      expect(screen.getByText('✓ Success')).toBeInTheDocument();
    });
  });

  it('should show loading indicator when isLoading is true', async () => {
    const { useChat } = require('ai/react');
    useChat.mockReturnValue({
      messages: [],
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: true,
    });

    render(<ChatInterface />);

    await waitFor(() => {
      // Check for animated loading dots
      const loadingDots = screen.getAllByRole('generic').filter(
        el => el.className.includes('animate-bounce')
      );
      expect(loadingDots.length).toBeGreaterThan(0);
    });
  });

  it('should disable input and button when loading', async () => {
    const { useChat } = require('ai/react');
    useChat.mockReturnValue({
      messages: [],
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: true,
    });

    render(<ChatInterface />);

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/Type a message.../i) as HTMLInputElement;
      const button = screen.getByText(/Send/i) as HTMLButtonElement;

      expect(input.disabled).toBe(true);
      expect(button.disabled).toBe(true);
    });
  });

  it('should call onWorkflowTriggered when workflow tool is called', async () => {
    const onWorkflowTriggered = jest.fn();
    const { useChat } = require('ai/react');

    let onToolCall: any = null;

    useChat.mockImplementation(({ onToolCall: cb }: any) => {
      onToolCall = cb;
      return {
        messages: [],
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: false,
      };
    });

    render(<ChatInterface onWorkflowTriggered={onWorkflowTriggered} />);

    await waitFor(() => {
      expect(onToolCall).toBeDefined();
    });

    // Simulate a workflow tool call
    onToolCall({ toolCall: { toolName: 'validateLead' } });

    expect(onWorkflowTriggered).toHaveBeenCalled();
  });

  it('should not call onWorkflowTriggered for non-workflow tools', async () => {
    const onWorkflowTriggered = jest.fn();
    const { useChat } = require('ai/react');

    let onToolCall: any = null;

    useChat.mockImplementation(({ onToolCall: cb }: any) => {
      onToolCall = cb;
      return {
        messages: [],
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: false,
      };
    });

    render(<ChatInterface onWorkflowTriggered={onWorkflowTriggered} />);

    await waitFor(() => {
      expect(onToolCall).toBeDefined();
    });

    // Simulate a non-workflow tool call
    onToolCall({ toolCall: { toolName: 'someOtherTool' } });

    expect(onWorkflowTriggered).not.toHaveBeenCalled();
  });
});
