'use client';

import { useState, useCallback, useEffect } from 'react';
import { WorkflowExecution } from '@/lib/types/workflow';
import { getStatusColor, getStatusIcon, formatDuration } from '@/lib/utils/workflow-display';

interface WorkflowStatusProps {
  refreshTrigger?: number;
}

export function WorkflowStatus({ refreshTrigger }: WorkflowStatusProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchExecutions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setExecutions(data);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh when refreshTrigger changes (when workflow is triggered from chat)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchExecutions();
    }
  }, [refreshTrigger, fetchExecutions]);

  const handleRefresh = useCallback(() => {
    fetchExecutions();
  }, [fetchExecutions]);
  
  // Show only the most recent 5 executions
  const recentExecutions = executions.slice(-5).reverse();
  
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
            className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            title="Refresh workflows"
          >
            {isRefreshing ? '⟳ Refreshing...' : '↻ Refresh'}
          </button>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Click refresh to update workflow status
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {recentExecutions.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">No workflows found</p>
            <p className="text-xs mt-1">Start a workflow from the chat</p>
          </div>
        )}
        
        {recentExecutions.map((execution) => (
          <div
            key={execution.id}
            className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {execution.workflowName.toUpperCase()}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Lead: {execution.leadId}
                </p>
              </div>
              <div className={`text-sm font-semibold ${getStatusColor(execution.status)}`}>
                {getStatusIcon(execution.status)} {execution.status}
              </div>
            </div>
            
            <div className="space-y-1">
              {execution.steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center text-xs"
                >
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
              Duration: {formatDuration(execution.startTime, execution.endTime)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
