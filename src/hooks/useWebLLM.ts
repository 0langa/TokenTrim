import { useCallback, useRef, useState } from 'react';
import type { WebWorkerMLCEngine, InitProgressReport } from '@mlc-ai/web-llm';

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
  'SmolLM2-360M-Instruct-q4f16_1-MLC': {
    desc: 'Fast, lightweight. Good for quick summaries.',
    size: '~130 MB',
  },
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': {
    desc: 'Slower but higher quality compression.',
    size: '~900 MB',
  },
};

export function getModelMeta(modelId: LlmModelId) {
  return MODEL_META[modelId];
}

export function useWebLLM(): UseWebLLMReturn {
  const engineRef = useRef<WebWorkerMLCEngine | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const currentCompressPromise = useRef<Promise<unknown> | null>(null);

  const [engineState, setEngineState] = useState<EngineState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const initEngine = useCallback(async (modelId: LlmModelId) => {
    setError(null);
    setProgress(0);
    setEngineState('downloading');

    try {
      // Terminate any existing worker/engine
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      engineRef.current = null;

      const worker = new Worker(
        new URL('../workers/webllm.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;

      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
      const engine = await CreateWebWorkerMLCEngine(worker, modelId, {
        initProgressCallback: (p: InitProgressReport) => {
          setProgress(p.progress ?? 0);
        },
      });

      engineRef.current = engine;
      setEngineState('ready');
      setProgress(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setEngineState('error');
    }
  }, []);

  const compress = useCallback(
    async (text: string, systemPrompt: string): Promise<string> => {
      const engine = engineRef.current;
      if (!engine) {
        throw new Error('Engine not initialized');
      }

      setEngineState('compressing');
      try {
        const promise = engine.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          temperature: 0.2,
          max_tokens: Math.max(256, Math.round(text.length / 3)),
          stream: false,
        });
        currentCompressPromise.current = promise;
        const reply = await promise;
        currentCompressPromise.current = null;

        const content = reply.choices[0]?.message?.content ?? '';
        setEngineState('ready');
        return content;
      } catch (err) {
        setEngineState('ready');
        throw err;
      }
    },
    [],
  );

  const abort = useCallback(() => {
    const engine = engineRef.current;
    if (engine && 'interruptGenerate' in engine) {
      (engine as WebWorkerMLCEngine).interruptGenerate();
    }

    if (engineState === 'compressing') {
      setEngineState('ready');
    }
  }, [engineState]);

  return { engineState, progress, error, initEngine, compress, abort };
}
