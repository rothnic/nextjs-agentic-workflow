'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { WorkflowRun } from '@/lib/workflows/workflow-tracking';
import { getStatusColor, getStatusIcon, formatDuration } from '@/lib/utils/workflow-display';

interface WorkflowStatusProps {
  refreshTrigger?: number;
}

const POLLING_INTERVAL = 1500; // Poll every 1.5 seconds
const MAX_POLLING_DURATION = 60000; // Stop polling after 60 seconds

export function WorkflowStatus({ refreshTrigger }: WorkflowStatusProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);

  const fetchRuns = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/workflows/runs');
      if (response.ok) {
        const data = await response.json();
        setRuns(data);
        return data as WorkflowRun[];
      }
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
    } finally {
      setIsRefreshing(false);
    }
    return [];
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    // Don't start if already polling
    if (isPolling) return;

    setIsPolling(true);
    pollingStartTimeRef.current = Date.now();

    // Set timeout to stop polling after MAX_POLLING_DURATION
    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling();
    }, MAX_POLLING_DURATION);

    // Start polling interval
    pollingIntervalRef.current = setInterval(async () => {
      const currentRuns = await fetchRuns();

      // Check if all workflows are completed or failed
      const hasRunningWorkflows = currentRuns.some(
        (run) => run.status === 'running' || run.status === 'pending'
      );

      // Stop polling if no running workflows
      if (!hasRunningWorkflows) {
        stopPolling();
      }

      // Also stop if we've exceeded max duration
      if (Date.now() - pollingStartTimeRef.current > MAX_POLLING_DURATION) {
        stopPolling();
      }
    }, POLLING_INTERVAL);

    // Do an immediate fetch
    fetchRuns();
  }, [isPolling, fetchRuns, stopPolling]);

  // Auto-refresh and start polling when refreshTrigger changes (workflow triggered from chat)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      startPolling();
    }
  }, [refreshTrigger, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const handleRefresh = useCallback(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Show only the most recent 5 runs
  const recentRuns = runs.slice(-5).reverse();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-300 dark:border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Workflow Status
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              isRefreshing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title="Refresh workflows"
          >
            <span className="inline-block min-w-[70px]">
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {isPolling
            ? 'Auto-refreshing workflow status...'
            : 'Click refresh to update workflow status'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {recentRuns.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">No workflows found</p>
            <p className="text-xs mt-1">Start a workflow from the chat</p>
          </div>
        )}

        {recentRuns.map((run) => (
          <div
            key={run.id}
            className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {run.workflowName.toUpperCase()}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Lead: {run.leadId}
                </p>
              </div>
              <div className={`text-sm font-semibold ${getStatusColor(run.status)}`}>
                {getStatusIcon(run.status)} {run.status}
              </div>
            </div>

            <div className="space-y-1">
              {run.steps.map((step) => (
                <div key={step.id} className="flex items-center text-xs">
                  <div className={`mr-2 ${getStatusColor(step.status)}`}>
                    {getStatusIcon(step.status)}
                  </div>
                  <div className="flex-1">
                    <span className="text-gray-900 dark:text-gray-100">{step.name}</span>
                  </div>
                  {step.startTime && (
                    <span className="text-gray-500 dark:text-gray-500 text-xs">
                      {formatDuration(step.startTime, step.endTime)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
              Duration: {formatDuration(run.startTime, run.endTime)}
            </div>

            {run.error && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                Error: {run.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
