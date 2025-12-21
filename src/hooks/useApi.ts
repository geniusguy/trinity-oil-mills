import { useState, useCallback } from 'react';
import { enqueueRequest } from '@/lib/offlineQueue';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export const useApi = (options?: UseApiOptions) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const execute = useCallback(async (url: string, config?: RequestInit) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...config?.headers,
        },
        ...config,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An error occurred');
      }

      setData(result);
      options?.onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      // If offline or fetch failed for a mutation, queue it
      const method = (config?.method || 'GET').toUpperCase();
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      if (isMutation) {
        try {
          await enqueueRequest({
            url,
            method,
            headers: (config?.headers as any) || {},
            body: config?.body ? JSON.parse(config.body as string) : undefined,
          });
          setError(null);
          options?.onSuccess?.({ queued: true });
          return { queued: true } as any;
        } catch (queueErr) {
          setError(errorMessage);
          options?.onError?.(err);
          throw err;
        }
      } else {
        setError(errorMessage);
        options?.onError?.(err);
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset,
  };
};

