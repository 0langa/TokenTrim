import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CompressionOptions,
  CompressionResult,
  CompressionWorkerRequest,
  CompressionWorkerResponse,
} from '../compression/types';

type CompareMode = 'light' | 'normal' | 'heavy' | 'ultra';

const MODES: CompareMode[] = ['light', 'normal', 'heavy', 'ultra'];

export interface UseParallelCompressionReturn {
  results: Record<CompareMode, CompressionResult | null>;
  processing: boolean;
  run: (text: string, baseOptions: CompressionOptions) => void;
}

export function useParallelCompression(): UseParallelCompressionReturn {
  const [results, setResults] = useState<Record<CompareMode, CompressionResult | null>>({
    light: null,
    normal: null,
    heavy: null,
    ultra: null,
  });
  const [processing, setProcessing] = useState(false);
  const workersRef = useRef<Record<CompareMode, Worker | null>>({
    light: null,
    normal: null,
    heavy: null,
    ultra: null,
  });
  const pendingRef = useRef(0);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const workers = workersRef.current;
    for (const mode of MODES) {
      workers[mode] = new Worker(
        new URL('../workers/compression.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workers[mode]!.onmessage = (e: MessageEvent<CompressionWorkerResponse>) => {
        if (e.data.requestId !== latestRequestIdRef.current) {
          return;
        }
        setResults((prev) => ({ ...prev, [mode]: e.data.result }));
        pendingRef.current -= 1;
        if (pendingRef.current <= 0) {
          setProcessing(false);
        }
      };
      workers[mode]!.onerror = () => {
        pendingRef.current -= 1;
        if (pendingRef.current <= 0) {
          setProcessing(false);
        }
      };
    }
    return () => {
      for (const mode of MODES) {
        workers[mode]?.terminate();
      }
    };
  }, []);

  const run = useCallback((text: string, baseOptions: CompressionOptions) => {
    if (!text.trim()) {
      latestRequestIdRef.current += 1;
      pendingRef.current = 0;
      setResults({ light: null, normal: null, heavy: null, ultra: null });
      setProcessing(false);
      return;
    }
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setProcessing(true);
    pendingRef.current = MODES.length;
    for (const mode of MODES) {
      const request: CompressionWorkerRequest = {
        requestId,
        text,
        options: { ...baseOptions, mode },
      };
      workersRef.current[mode]?.postMessage(request);
    }
  }, []);

  return { results, processing, run };
}
