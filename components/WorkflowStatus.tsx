'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { WorkflowRun } from '@/lib/workflows/workflow-tracking';
import { getStatusColor, getStatusIcon, formatDuration } from '@/lib/utils/workflow-display';

interface WorkflowStatusProps {
  refreshTrigger?: number;
}

const POLLING_INTERVAL = 5000; // Poll every 5 seconds
const MAX_POLLING_DURATION = 30000; // Stop polling after 30 seconds
const MAX_EMPTY_REQUESTS = 50; // Stop after 50 empty requests

export function WorkflowStatus({ refreshTrigger }: WorkflowStatusProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);
  const emptyRequestCountRef = useRef<number>(0);

  const fetchRuns = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('[WorkflowStatus] Fetching workflow runs...');
      const response = await fetch('/api/workflows/runs');
      if (response.ok) {
        const data = await response.json();
        console.log('[WorkflowStatus] Received', data.length, 'workflow runs');
        setRuns(data);

        // Track empty requests
        if (data.length === 0) {
          emptyRequestCountRef.current += 1;
          console.log('[WorkflowStatus] Empty request count:', emptyRequestCountRef.current);

          // Enter idle state after MAX_EMPTY_REQUESTS
          if (emptyRequestCountRef.current >= MAX_EMPTY_REQUESTS) {
            console.log('[WorkflowStatus] Entering idle state after', MAX_EMPTY_REQUESTS, 'empty requests');
            setIsIdle(true);
            stopPolling();
          }
        } else {
          // Reset counter when we get data
          emptyRequestCountRef.current = 0;
          setIsIdle(false);
        }

        return data as WorkflowRun[];
      }
    } catch (error) {
      console.error('[WorkflowStatus] Error fetching workflow runs:', error);
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
    // Don't start if already polling or in idle state
    if (isPolling || isIdle) {
      console.log('[WorkflowStatus] Not starting polling - isPolling:', isPolling, 'isIdle:', isIdle);
      return;
    }

    // Don't start polling if tab is not visible
    if (document.hidden) {
      console.log('[WorkflowStatus] Not starting polling - tab is hidden');
      return;
    }

    console.log('[WorkflowStatus] Starting polling...');
    setIsPolling(true);
    pollingStartTimeRef.current = Date.now();

    // Set timeout to stop polling after MAX_POLLING_DURATION
    pollingTimeoutRef.current = setTimeout(() => {
      console.log('[WorkflowStatus] Stopping polling - max duration reached');
      stopPolling();
    }, MAX_POLLING_DURATION);

    // Start polling interval
    pollingIntervalRef.current = setInterval(async () => {
      // Stop polling if tab is not visible
      if (document.hidden) {
        console.log('[WorkflowStatus] Stopping polling - tab is hidden');
        stopPolling();
        return;
      }

      const currentRuns = await fetchRuns();

      // Check if all workflows are completed or failed
      const hasRunningWorkflows = currentRuns.some(
        (run) => run.status === 'running' || run.status === 'pending'
      );

      // Stop polling if no running workflows
      if (!hasRunningWorkflows) {
        console.log('[WorkflowStatus] Stopping polling - no running workflows');
        stopPolling();
      }

      // Also stop if we've exceeded max duration
      if (Date.now() - pollingStartTimeRef.current > MAX_POLLING_DURATION) {
        console.log('[WorkflowStatus] Stopping polling - max duration exceeded');
        stopPolling();
      }
    }, POLLING_INTERVAL);

    // Do an immediate fetch
    fetchRuns();
  }, [isPolling, isIdle, fetchRuns, stopPolling]);

  // Auto-refresh and start polling when refreshTrigger changes (workflow triggered from chat)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('[WorkflowStatus] Refresh triggered');
      // Reset idle state when new workflow is triggered
      setIsIdle(false);
      emptyRequestCountRef.current = 0;
      startPolling();
    }
  }, [refreshTrigger, startPolling]);

  // Stop polling when tab becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPolling) {
        console.log('[WorkflowStatus] Tab hidden - stopping polling');
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const handleRefresh = useCallback(() => {
    console.log('[WorkflowStatus] Manual refresh clicked');
    // Reset idle state on manual refresh
    setIsIdle(false);
    emptyRequestCountRef.current = 0;
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
          {isIdle
            ? 'Idle - click refresh to check for updates'
            : isPolling
            ? 'Auto-refreshing every 5 seconds...'
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
