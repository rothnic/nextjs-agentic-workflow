import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { WorkflowStatus } from '@/components/WorkflowStatus';

// Mock fetch
global.fetch = jest.fn();

describe('WorkflowStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  it('renders the workflow status panel', () => {
    render(<WorkflowStatus />);

    expect(screen.getByText('Workflow Status')).toBeInTheDocument();
    expect(screen.getByText('Click refresh to update workflow status')).toBeInTheDocument();
  });

  it('displays message when no workflows are running', () => {
    render(<WorkflowStatus />);

    expect(screen.getByText('No workflows found')).toBeInTheDocument();
    expect(screen.getByText('Start a workflow from the chat')).toBeInTheDocument();
  });

  it('fetches workflow executions when refreshTrigger changes', () => {
    const { rerender } = render(<WorkflowStatus refreshTrigger={0} />);

    // Initial render with refreshTrigger=0 doesn't fetch
    expect(global.fetch).not.toHaveBeenCalled();

    // Change refreshTrigger
    rerender(<WorkflowStatus refreshTrigger={1} />);

    expect(global.fetch).toHaveBeenCalledWith('/api/workflows');
  });

  it('displays workflow executions when available', async () => {
    const mockExecutions = [
      {
        id: 'exec-1',
        workflowName: 'validate',
        leadId: 'lead-1',
        status: 'completed',
        steps: [
          { id: 'step-1', name: 'Validate Email', status: 'completed', startTime: Date.now() - 1000, endTime: Date.now() },
        ],
        startTime: Date.now() - 2000,
        endTime: Date.now(),
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockExecutions,
    });

    const { rerender } = render(<WorkflowStatus refreshTrigger={0} />);
    rerender(<WorkflowStatus refreshTrigger={1} />);

    // Wait for the component to fetch and render data
    await screen.findByText('VALIDATE');
    expect(screen.getByText(/Lead:/)).toBeInTheDocument();
    expect(screen.getByText('Validate Email')).toBeInTheDocument();
  });

  it('handles fetch errors gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

    const { rerender } = render(<WorkflowStatus refreshTrigger={0} />);
    rerender(<WorkflowStatus refreshTrigger={1} />);

    // Component should still render without crashing
    expect(screen.getByText('Workflow Status')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
