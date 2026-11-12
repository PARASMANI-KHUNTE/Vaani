/**
 * Async Handler Utility
 * Wrapper for async route handlers to catch errors automatically
 */

import { Request, Response, NextFunction } from 'express';

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (handler: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

// ============================================================================
// Higher-order function for multiple handlers
// ============================================================================

export const asyncHandlers = (...handlers: AsyncHandler[]) => {
  return handlers.map(asyncHandler);
};

// ============================================================================
// Wrapper for controller methods
// ============================================================================

export const wrapAsync = <T extends (...args: unknown[]) => Promise<unknown>>(fn: T): T => {
  return ((...args: unknown[]) => {
    const [req, res, next] = args as [Request, Response, NextFunction];
    Promise.resolve(fn(...args)).catch(next);
  }) as T;
};

// ============================================================================
// Parallel execution with error handling
// ============================================================================

export const parallelAsync = async <T>(
  tasks: Array<() => Promise<T>>,
  options: { stopOnError?: boolean; maxConcurrent?: number } = {}
): Promise<T[]> => {
  const { stopOnError = true, maxConcurrent = 10 } = options;
  const results: T[] = [];

  for (let i = 0; i < tasks.length; i += maxConcurrent) {
    const batch = tasks.slice(i, i + maxConcurrent);
    try {
      const batchResults = await Promise.all(batch.map((task) => task()));
      results.push(...batchResults);
    } catch (error) {
      if (stopOnError) {
        throw error;
      }
      // Continue with other tasks if not stopping on error
    }
  }

  return results;
};

// ============================================================================
// Sequential execution with error handling
// ============================================================================

export const sequentialAsync = async <T>(
  tasks: Array<() => Promise<T>>,
  options: { stopOnError?: boolean } = {}
): Promise<T[]> => {
  const { stopOnError = true } = options;
  const results: T[] = [];

  for (const task of tasks) {
    try {
      const result = await task();
      results.push(result);
    } catch (error) {
      if (stopOnError) {
        throw error;
      }
    }
  }

  return results;
};

// ============================================================================
// Timeout wrapper
// ============================================================================

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error = new Error('Operation timed out')
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(timeoutError), timeoutMs)
    ),
  ]);
};

// ============================================================================
// Retry wrapper
// ============================================================================

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: { retries: number; delay: number; backoff?: number; onRetry?: (error: Error, attempt: number) => void } = { retries: 3, delay: 1000 }
): Promise<T> => {
  const { retries, delay, backoff = 2, onRetry } = options;

  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    onRetry?.(error as Error, retries);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, { retries: retries - 1, delay: delay * backoff, backoff, onRetry });
  }
};