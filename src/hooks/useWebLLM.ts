import { useCallback, useRef, useState } from 'react';

export type LlmModelId =
  | 'SmolLM2-360M-Instruct-q4f16_1-MLC'
  | 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

export type EngineState = 'idle' | 'downloading' | 'ready' | 'compressing' | 'error';

interface UseWebLLMReturn {
  engineState: EngineState;
  progress: number;
  error: string | null;
  initEngine: (modelId: LlmModelId) => void;
  compress: (text: string, systemPrompt: string) => Promise<string>;
  abort: () => void;
}

const MODEL_META: Record<LlmModelId, { desc: string; size: string }> = {
  'SmolLM2-360M-Instruct-q4f16_1-MLC': { desc: 'Fast, lightweight. Good for quick summaries.', size: '~130 MB' },
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': { desc: 'Slower but higher quality compression.', size: '~900 MB' },
};

export function getModelMeta(modelId: LlmModelId) {
  return MODEL_META[modelId];
}

export function useWebLLM(): UseWebLLMReturn {
  const workerRef = useRef<Worker | null>(null);
  const [engineState, setEngineState] = useState<EngineState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const resolveRef = useRef<((value: string) => void) | null>(null);
  const rejectRef = useRef<((reason: Error) => void) | null>(null);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      const worker = new Worker(
        new URL('../workers/webllm.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker.onmessage = (e: MessageEvent) => {
        const data = e.data;
        if (data.type === 'progress') {
          setProgress(data.progress ?? 0);
        } else if (data.type === 'ready') {
          setEngineState('ready');
          setProgress(1);
        } else if (data.type === 'result') {
          setEngineState('ready');
          resolveRef.current?.(data.output ?? '');
          resolveRef.current = null;
          rejectRef.current = null;
        } else if (data.type === 'error') {
          setEngineState('error');
          setError(data.message ?? 'Unknown error');
          rejectRef.current?.(new Error(data.message ?? 'Unknown error'));
          resolveRef.current = null;
          rejectRef.current = null;
        }
      };
      worker.onerror = (err) => {
        setEngineState('error');
        setError(err.message ?? 'Worker error');
        rejectRef.current?.(new Error(err.message ?? 'Worker error'));
        resolveRef.current = null;
        rejectRef.current = null;
      };
      workerRef.current = worker;
    }
    return workerRef.current;
  }, []);

  const initEngine = useCallback((modelId: LlmModelId) => {
    setError(null);
    setProgress(0);
    setEngineState('downloading');
    const worker = getWorker();
    worker.postMessage({ type: 'init', modelId });
  }, [getWorker]);

  const compress = useCallback((text: string, systemPrompt: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (engineState !== 'ready') {
        reject(new Error('Engine not ready'));
        return;
      }
      resolveRef.current = resolve;
      rejectRef.current = reject;
      setEngineState('compressing');
      const worker = getWorker();
      worker.postMessage({ type: 'compress', text, style: systemPrompt });
    });
  }, [engineState, getWorker]);

  const abort = useCallback(() => {
    const worker = workerRef.current;
    if (worker) {
      worker.postMessage({ type: 'abort' });
    }
    if (resolveRef.current) {
      rejectRef.current?.(new Error('Aborted'));
      resolveRef.current = null;
      rejectRef.current = null;
    }
    if (engineState === 'compressing') {
      setEngineState('ready');
    }
  }, [engineState]);

  return { engineState, progress, error, initEngine, compress, abort };
}
