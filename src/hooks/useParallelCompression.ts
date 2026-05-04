import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompressionOptions, CompressionResult } from '../compression/types';

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

  useEffect(() => {
    const workers = workersRef.current;
    for (const mode of MODES) {
      workers[mode] = new Worker(
        new URL('../workers/compression.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workers[mode]!.onmessage = (e: MessageEvent<CompressionResult>) => {
        setResults((prev) => ({ ...prev, [mode]: e.data }));
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
      setResults({ light: null, normal: null, heavy: null, ultra: null });
      setProcessing(false);
      return;
    }
    setProcessing(true);
    pendingRef.current = MODES.length;
    for (const mode of MODES) {
      workersRef.current[mode]?.postMessage({
        text,
        options: { ...baseOptions, mode },
      });
    }
  }, []);

  return { results, processing, run };
}
