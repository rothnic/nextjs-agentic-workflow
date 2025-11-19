/**
 * Workflow tracking for monitoring execution status
 *
 * This module provides persistent tracking of workflow executions
 * using Redis with in-memory fallback for local development.
 */

import { nanoid } from 'nanoid';
import Redis from 'ioredis';

export interface WorkflowRun {
  id: string;
  workflowName: string;
  leadId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  result?: unknown;
  error?: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  result?: unknown;
}

// In-memory storage for workflow runs (fallback for local dev)
const workflowRuns = new Map<string, WorkflowRun>();

// Event listeners for real-time updates
type WorkflowListener = (run: WorkflowRun) => void;
const listeners = new Set<WorkflowListener>();

// Redis client instance
let redisClient: Redis | null = null;
let redisConnectionAttempted = false;
let redisLastError: Error | null = null;

// Initialize Redis client
function getRedisClient(): Redis | null {
  if (!process.env.KV_REST_API_REDIS_URL) {
    if (!redisConnectionAttempted) {
      console.warn('[Workflow Tracking] KV_REST_API_REDIS_URL not set - using in-memory storage');
      console.warn('[Workflow Tracking] WARNING: In-memory storage does not persist across serverless function invocations');
      console.warn('[Workflow Tracking] Please set KV_REST_API_REDIS_URL environment variable for persistent storage');
      redisConnectionAttempted = true;
    }
    return null;
  }

  if (!redisClient) {
    try {
      // Extract connection details for logging (without credentials)
      const urlObj = new URL(process.env.KV_REST_API_REDIS_URL);
      const sanitizedUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      console.log('[Workflow Tracking] Attempting Redis connection to:', sanitizedUrl);

      redisClient = new Redis(process.env.KV_REST_API_REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          console.log(`[Workflow Tracking] Redis retry attempt ${times}, delay: ${delay}ms`);
          return delay;
        },
        enableReadyCheck: true,
        connectTimeout: 10000, // 10 second timeout
        lazyConnect: true,
      });

      redisClient.on('connect', () => {
        console.log('[Workflow Tracking] Redis client connecting...');
      });

      redisClient.on('ready', () => {
        console.log('[Workflow Tracking] Redis connection ready!');
        redisLastError = null;
      });

      redisClient.on('error', (error) => {
        console.error('[Workflow Tracking] Redis connection error:', error.message);
        redisLastError = error;
      });

      redisClient.on('close', () => {
        console.warn('[Workflow Tracking] Redis connection closed');
      });

      redisClient.on('reconnecting', () => {
        console.log('[Workflow Tracking] Redis reconnecting...');
      });

      // Connect to Redis
      redisClient.connect().catch((error) => {
        console.error('[Workflow Tracking] Redis connect failed:', error.message);
        console.warn('[Workflow Tracking] Falling back to in-memory storage (data will not persist)');
        redisLastError = error;
      });

      redisConnectionAttempted = true;
    } catch (error) {
      console.error('[Workflow Tracking] Redis initialization error:', error instanceof Error ? error.message : error);
      console.warn('[Workflow Tracking] Falling back to in-memory storage (data will not persist)');
      return null;
    }
  }

  return redisClient;
}

// Check if Redis is available and ready to use
const isRedisAvailable = () => {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  const status = client.status;
  if (status === 'ready') {
    return true;
  }

  // Log status for debugging
  if (status === 'connecting' || status === 'connect') {
    console.log('[Workflow Tracking] Redis status: connecting...');
  } else if (status === 'reconnecting') {
    console.log('[Workflow Tracking] Redis status: reconnecting...');
  } else if (status === 'close' || status === 'end') {
    console.warn('[Workflow Tracking] Redis status: closed');
    if (redisLastError) {
      console.warn('[Workflow Tracking] Last Redis error:', redisLastError.message);
    }
  }

  return false;
};

/**
 * Subscribe to workflow run updates
 */
export function subscribeToWorkflowRuns(listener: WorkflowListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of a workflow update
 */
function notifyListeners(run: WorkflowRun) {
  listeners.forEach(listener => listener(run));
}

/**
 * Create a new workflow run
 */
export async function createWorkflowRun(
  workflowName: string,
  leadId: string,
  stepNames: string[]
): Promise<WorkflowRun> {
  const runId = nanoid();
  const run: WorkflowRun = {
    id: runId,
    workflowName,
    leadId,
    status: 'pending',
    startTime: Date.now(),
    steps: stepNames.map(name => ({
      id: nanoid(),
      name,
      status: 'pending' as const,
    })),
  };

  // Store in Redis if available
  const redis = getRedisClient();
  const redisReady = isRedisAvailable();

  console.log('[Workflow Tracking] Creating workflow run:', { runId, workflowName, leadId, redisReady });

  if (redis && redisReady) {
    try {
      await redis.set(`workflow:${runId}`, JSON.stringify(run));
      await redis.zadd('workflow:runs', run.startTime, runId);
      console.log('[Workflow Tracking] Stored workflow run in Redis:', runId);
    } catch (error) {
      console.error('[Workflow Tracking] Redis storage error:', error instanceof Error ? error.message : error);
      console.warn('[Workflow Tracking] Falling back to in-memory storage for run:', runId);
      // Fall back to in-memory
      workflowRuns.set(runId, run);
    }
  } else {
    if (!redisReady) {
      console.warn('[Workflow Tracking] Redis not ready, using in-memory storage for run:', runId);
    }
    workflowRuns.set(runId, run);
  }

  notifyListeners(run);

  return run;
}

/**
 * Update workflow run status
 */
export async function updateWorkflowStatus(
  runId: string,
  status: WorkflowRun['status'],
  result?: unknown,
  error?: string
) {
  let run: WorkflowRun | undefined | null;

  const redis = getRedisClient();
  if (redis && isRedisAvailable()) {
    try {
      const data = await redis.get(`workflow:${runId}`);
      run = data ? JSON.parse(data) : undefined;
    } catch (error) {
      console.error('[Workflow Tracking] Redis get error:', error);
      run = workflowRuns.get(runId);
    }
  } else {
    run = workflowRuns.get(runId);
  }

  if (!run) return;

  run.status = status;
  if (result !== undefined) run.result = result;
  if (error !== undefined) run.error = error;
  if (status === 'completed' || status === 'failed') {
    run.endTime = Date.now();
  }

  // Update in Redis if available
  if (redis && isRedisAvailable()) {
    try {
      await redis.set(`workflow:${runId}`, JSON.stringify(run));
    } catch (error) {
      console.error('[Workflow Tracking] Redis set error:', error);
      workflowRuns.set(runId, run);
    }
  } else {
    workflowRuns.set(runId, run);
  }

  notifyListeners(run);
}

/**
 * Update a specific step status
 */
export async function updateStepStatus(
  runId: string,
  stepIndex: number,
  status: WorkflowStep['status'],
  result?: unknown
) {
  let run: WorkflowRun | undefined | null;

  const redis = getRedisClient();
  if (redis && isRedisAvailable()) {
    try {
      const data = await redis.get(`workflow:${runId}`);
      run = data ? JSON.parse(data) : undefined;
    } catch (error) {
      console.error('[Workflow Tracking] Redis get error:', error);
      run = workflowRuns.get(runId);
    }
  } else {
    run = workflowRuns.get(runId);
  }

  if (!run || !run.steps[stepIndex]) return;

  const step = run.steps[stepIndex];
  step.status = status;

  if (status === 'running') {
    step.startTime = Date.now();
  } else if (status === 'completed' || status === 'failed') {
    step.endTime = Date.now();
    if (result !== undefined) step.result = result;
  }

  // Update in Redis if available
  if (redis && isRedisAvailable()) {
    try {
      await redis.set(`workflow:${runId}`, JSON.stringify(run));
    } catch (error) {
      console.error('[Workflow Tracking] Redis set error:', error);
      workflowRuns.set(runId, run);
    }
  } else {
    workflowRuns.set(runId, run);
  }

  notifyListeners(run);
}

/**
 * Get a workflow run by ID
 */
export async function getWorkflowRun(runId: string): Promise<WorkflowRun | undefined | null> {
  const redis = getRedisClient();
  if (redis && isRedisAvailable()) {
    try {
      const data = await redis.get(`workflow:${runId}`);
      return data ? JSON.parse(data) : undefined;
    } catch (error) {
      console.error('[Workflow Tracking] Redis get error:', error);
      return workflowRuns.get(runId);
    }
  }
  return workflowRuns.get(runId);
}

/**
 * Get all workflow runs
 */
export async function getAllWorkflowRuns(): Promise<WorkflowRun[]> {
  const redis = getRedisClient();
  const redisReady = isRedisAvailable();

  console.log('[Workflow Tracking] Getting all workflow runs, Redis ready:', redisReady);

  if (redis && redisReady) {
    try {
      // Get run IDs from sorted set (newest first)
      const runIds = await redis.zrevrange('workflow:runs', 0, -1);
      console.log('[Workflow Tracking] Found', runIds.length, 'workflow IDs in Redis');

      // Fetch all runs
      const runs: WorkflowRun[] = [];
      for (const runId of runIds) {
        const data = await redis.get(`workflow:${runId}`);
        if (data) {
          runs.push(JSON.parse(data));
        }
      }
      console.log('[Workflow Tracking] Retrieved', runs.length, 'workflows from Redis');
      return runs;
    } catch (error) {
      console.error('[Workflow Tracking] Redis get all error:', error instanceof Error ? error.message : error);
      console.warn('[Workflow Tracking] Falling back to in-memory storage');
      const memoryRuns = Array.from(workflowRuns.values());
      console.log('[Workflow Tracking] Found', memoryRuns.length, 'workflows in memory');
      return memoryRuns;
    }
  }

  const memoryRuns = Array.from(workflowRuns.values());
  console.log('[Workflow Tracking] Redis not available, found', memoryRuns.length, 'workflows in memory');
  return memoryRuns;
}

/**
 * Get recent workflow runs (last N runs)
 */
export async function getRecentWorkflowRuns(limit: number = 10): Promise<WorkflowRun[]> {
  const redis = getRedisClient();
  if (redis && isRedisAvailable()) {
    try {
      // Get recent run IDs from sorted set (newest first)
      const runIds = await redis.zrevrange('workflow:runs', 0, limit - 1);

      // Fetch runs
      const runs: WorkflowRun[] = [];
      for (const runId of runIds) {
        const data = await redis.get(`workflow:${runId}`);
        if (data) {
          runs.push(JSON.parse(data));
        }
      }
      return runs;
    } catch (error) {
      console.error('[Workflow Tracking] Redis get recent error:', error);
      return getRecentWorkflowRunsFromMemory(limit);
    }
  }
  return getRecentWorkflowRunsFromMemory(limit);
}

/**
 * Get recent workflow runs from in-memory storage
 */
function getRecentWorkflowRunsFromMemory(limit: number = 10): WorkflowRun[] {
  const allRuns = Array.from(workflowRuns.values());
  return allRuns
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, limit);
}
