import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompressionLegend, CompressionOptions, CompressionResult } from '../compression/types';

const DEBOUNCE_MS = 300;

export interface UseCompressionReturn {
  result: CompressionResult | null;
  processing: boolean;
  run: (text: string, options: CompressionOptions) => void;
  restore: (text: string, legend: CompressionLegend | Record<string, string>) => Promise<{ output: string; error: string | null }>;
}

export function useCompression(): UseCompressionReturn {
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreResolverRef = useRef<((value: { output: string; error: string | null }) => void) | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/compression.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e: MessageEvent<{ kind: 'compress' | 'decompress'; result: unknown }>) => {
      if (e.data.kind === 'compress') {
        setResult(e.data.result as CompressionResult);
        setProcessing(false);
      } else {
        const payload = e.data.result as { output: string; error: string | null };
        restoreResolverRef.current?.(payload);
        restoreResolverRef.current = null;
      }
    };
    return () => {
      workerRef.current?.terminate();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const run = useCallback((text: string, options: CompressionOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text.trim()) {
      setResult(null);
      setProcessing(false);
      return;
    }
    setProcessing(true);
    timerRef.current = setTimeout(() => {
      workerRef.current?.postMessage({ kind: 'compress', payload: { text, options } });
    }, DEBOUNCE_MS);
  }, []);

  const restore = useCallback((text: string, legend: CompressionLegend | Record<string, string>) => {
    return new Promise<{ output: string; error: string | null }>((resolve) => {
      restoreResolverRef.current = resolve;
      workerRef.current?.postMessage({ kind: 'decompress', payload: { text, legend } });
    });
  }, []);

  return { result, processing, run, restore };
}
