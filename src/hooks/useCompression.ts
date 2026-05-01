import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompressionOptions, CompressionResult } from '../compression/types';

const DEBOUNCE_MS = 300;

export interface UseCompressionReturn {
  result: CompressionResult | null;
  processing: boolean;
  run: (text: string, options: CompressionOptions) => void;
}

export function useCompression(): UseCompressionReturn {
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/compression.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e: MessageEvent<CompressionResult>) => {
      setResult(e.data);
      setProcessing(false);
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
      workerRef.current?.postMessage({ text, options });
    }, DEBOUNCE_MS);
  }, []);

  return { result, processing, run };
}
