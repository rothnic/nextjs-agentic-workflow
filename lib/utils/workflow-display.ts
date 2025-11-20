/**
 * Shared utilities for displaying workflow status in UI components
 * Following DRY principles
 */

export type WorkflowStatus = 'completed' | 'running' | 'failed' | 'pending';

/**
 * Get color class for a workflow status
 */
export function getStatusColor(status: WorkflowStatus): string {
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
}

/**
 * Get icon for a workflow status
 */
export function getStatusIcon(status: WorkflowStatus): string {
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
}

/**
 * Format duration from start to end time
 */
export function formatDuration(start: number, end?: number): string {
  const duration = (end || Date.now()) - start;
  return `${(duration / 1000).toFixed(1)}s`;
}

/**
 * Get background color for success/failure states
 */
export function getSuccessColor(success: boolean): string {
  return success
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';
}
