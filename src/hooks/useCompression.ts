import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CompressionOptions,
  CompressionResult,
  CompressionWorkerRequest,
  CompressionWorkerResponse,
} from '../compression/types';

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
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/compression.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e: MessageEvent<CompressionWorkerResponse>) => {
      if (e.data.requestId !== latestRequestIdRef.current) {
        return;
      }
      setResult(e.data.result);
      setProcessing(false);
    };
    workerRef.current.onerror = () => {
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
      latestRequestIdRef.current += 1;
      setResult(null);
      setProcessing(false);
      return;
    }
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setProcessing(true);
    timerRef.current = setTimeout(() => {
      const request: CompressionWorkerRequest = { requestId, text, options };
      workerRef.current?.postMessage(request);
    }, DEBOUNCE_MS);
  }, []);

  return { result, processing, run };
}
