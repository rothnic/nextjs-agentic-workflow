'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { WorkflowRun } from '@/lib/workflows/workflow-tracking';
import { getStatusColor, getStatusIcon, formatDuration } from '@/lib/utils/workflow-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCwIcon, ActivityIcon, ClockIcon, CheckCircle2Icon, XCircleIcon, LoaderIcon } from 'lucide-react';

interface WorkflowStatusProps {
  refreshTrigger?: number;
}

const POLLING_INTERVAL = 5000; // Poll every 5 seconds
const MAX_POLLING_DURATION = 30000; // Stop polling after 30 seconds
const MAX_EMPTY_REQUESTS = 50; // Stop after 50 empty requests

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2Icon className="size-4 text-green-600" />;
    case 'failed':
      return <XCircleIcon className="size-4 text-red-600" />;
    case 'running':
      return <LoaderIcon className="size-4 text-blue-600 animate-spin" />;
    case 'pending':
      return <ClockIcon className="size-4 text-yellow-600" />;
    default:
      return <ActivityIcon className="size-4 text-gray-600" />;
  }
};

export function WorkflowStatus({ refreshTrigger }: WorkflowStatusProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);
  const emptyRequestCountRef = useRef<number>(0);

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
  }, [stopPolling]);

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
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ActivityIcon className="size-5" />
            <div>
              <h2 className="text-lg font-semibold">Workflow Status</h2>
              <p className="text-xs text-muted-foreground">
                {isIdle
                  ? 'Idle - click refresh to check for updates'
                  : isPolling
                  ? 'Auto-refreshing every 5 seconds...'
                  : 'Click refresh to update'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="sm"
            variant="outline"
          >
            <RefreshCwIcon className={`size-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {recentRuns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ActivityIcon className="size-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium text-center">No workflows found</p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Start a workflow from the chat
                </p>
              </CardContent>
            </Card>
          ) : (
            recentRuns.map((run) => (
              <Card key={run.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-semibold uppercase">
                        {run.workflowName}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Lead: {run.leadId}
                      </CardDescription>
                    </div>
                    <Badge variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                      <StatusIcon status={run.status} />
                      <span className="ml-1">{run.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {run.steps.map((step, index) => (
                    <div key={step.id}>
                      <div className="flex items-center text-xs">
                        <div className="mr-2">
                          <StatusIcon status={step.status} />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">{step.name}</span>
                        </div>
                        {step.startTime && (
                          <span className="text-muted-foreground text-xs">
                            {formatDuration(step.startTime, step.endTime)}
                          </span>
                        )}
                      </div>
                      {index < run.steps.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}

                  <Separator className="my-3" />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="size-3" />
                      <span>Duration: {formatDuration(run.startTime, run.endTime)}</span>
                    </div>
                  </div>

                  {run.error && (
                    <div className="mt-2 p-2 text-xs text-destructive bg-destructive/10 rounded">
                      Error: {run.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
