'use client';

import { useEffect, useState } from 'react';
import { WorkflowExecution } from '@/lib/types/workflow';

export function WorkflowStatus() {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  
  useEffect(() => {
    // Poll for workflow updates
    const fetchExecutions = async () => {
      try {
        const response = await fetch('/api/workflows');
        if (response.ok) {
          const data = await response.json();
          setExecutions(data);
        }
      } catch (error) {
        console.error('Error fetching workflows:', error);
      }
    };
    
    // Initial fetch
    fetchExecutions();
    
    // Poll every second
    const interval = setInterval(fetchExecutions, 1000);
    
    // Update current time for duration calculations
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'running':
        return 'text-blue-600 dark:text-blue-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'running':
        return '⟳';
      case 'failed':
        return '✗';
      default:
        return '○';
    }
  };
  
  const formatDuration = (start: number, end?: number) => {
    const duration = (end || currentTime) - start;
    return `${(duration / 1000).toFixed(1)}s`;
  };
  
  // Show only the most recent 5 executions
  const recentExecutions = executions.slice(-5).reverse();
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-300 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Workflow Status
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Real-time execution tracking
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {recentExecutions.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">No workflows running</p>
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
