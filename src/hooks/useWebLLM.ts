import { useCallback, useRef, useState } from 'react';
import type { InitProgressReport, WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { estimateTokens } from '../compression/tokenizers/index';

export type LlmModelId =
  | 'SmolLM2-360M-Instruct-q4f16_1-MLC'
  | 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

export type EngineState = 'idle' | 'downloading' | 'ready' | 'compressing' | 'error';

interface UseWebLLMReturn {
  engineState: EngineState;
  progress: number;
  error: string | null;
  loadedModelId: LlmModelId | null;
  initEngine: (modelId: LlmModelId) => Promise<void>;
  compress: (text: string, systemPrompt: string) => Promise<string>;
  abort: () => void;
}

type ModelMeta = {
  desc: string;
  size: string;
  contextWindow: number;
  preferredOutputTokens: number;
  maxOutputTokens: number;
};

export type CompressionPlan = {
  chunks: string[];
  contextWindow: number;
  estimatedInputTokens: number;
  promptTokens: number;
  inputBudgetTokens: number;
  maxTokens: number;
  chunked: boolean;
};

const CONTEXT_OVERHEAD_TOKENS = 192;
const MIN_OUTPUT_TOKENS = 128;
const AVG_CHARS_PER_TOKEN = 4;

const MODEL_META: Record<LlmModelId, ModelMeta> = {
  'SmolLM2-360M-Instruct-q4f16_1-MLC': {
    desc: 'Fast, lightweight. Best for short local rewrites.',
    size: '~130 MB',
    contextWindow: 4096,
    preferredOutputTokens: 320,
    maxOutputTokens: 640,
  },
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': {
    desc: 'Slower, larger, better at longer structured compression.',
    size: '~900 MB',
    contextWindow: 4096,
    preferredOutputTokens: 512,
    maxOutputTokens: 1024,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function splitOversizedBlock(block: string, maxChars: number): string[] {
  if (block.length <= maxChars) {
    return [block];
  }

  const chunks: string[] = [];
  const sentences = block.match(/[^.!?\n]+(?:[.!?]+|\n+|$)/g) ?? [block];
  let current = '';

  for (const sentence of sentences) {
    const part = sentence.trim();
    if (!part) continue;

    const candidate = current ? `${current} ${part}` : part;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = '';
    }

    if (part.length <= maxChars) {
      current = part;
      continue;
    }

    for (let index = 0; index < part.length; index += maxChars) {
      chunks.push(part.slice(index, index + maxChars).trim());
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.filter(Boolean);
}

export function splitTextForLlm(text: string, maxInputTokens: number): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const maxChars = Math.max(800, maxInputTokens * AVG_CHARS_PER_TOKEN);
  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length === 0) {
    return splitOversizedBlock(normalized, maxChars);
  }

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = '';
    }

    if (paragraph.length <= maxChars) {
      current = paragraph;
      continue;
    }

    const parts = splitOversizedBlock(paragraph, maxChars);
    if (parts.length > 0) {
      chunks.push(...parts.slice(0, -1));
      current = parts.at(-1) ?? '';
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.filter(Boolean);
}

export function createCompressionPlan(
  text: string,
  systemPrompt: string,
  modelId: LlmModelId,
): CompressionPlan {
  const meta = MODEL_META[modelId];
  const estimatedInputTokens = estimateTokens(text, 'approx-generic').tokens;
  const promptTokens = estimateTokens(systemPrompt, 'approx-generic').tokens;
  const inputBudgetTokens = Math.max(
    256,
    meta.contextWindow - promptTokens - meta.preferredOutputTokens - CONTEXT_OVERHEAD_TOKENS,
  );

  if (estimatedInputTokens <= inputBudgetTokens) {
    const availableOutput = meta.contextWindow - promptTokens - estimatedInputTokens - CONTEXT_OVERHEAD_TOKENS;
    return {
      chunks: [text.trim()],
      contextWindow: meta.contextWindow,
      estimatedInputTokens,
      promptTokens,
      inputBudgetTokens,
      maxTokens: clamp(availableOutput, MIN_OUTPUT_TOKENS, meta.maxOutputTokens),
      chunked: false,
    };
  }

  return {
    chunks: splitTextForLlm(text, inputBudgetTokens),
    contextWindow: meta.contextWindow,
    estimatedInputTokens,
    promptTokens,
    inputBudgetTokens,
    maxTokens: meta.preferredOutputTokens,
    chunked: true,
  };
}

export function getModelMeta(modelId: LlmModelId) {
  return MODEL_META[modelId];
}

class GenerationAbortedError extends Error {
  constructor() {
    super('Generation stopped.');
  }
}

export function useWebLLM(): UseWebLLMReturn {
  const engineRef = useRef<WebWorkerMLCEngine | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const loadedModelIdRef = useRef<LlmModelId | null>(null);
  const activeRunIdRef = useRef(0);
  const abortRequestedRef = useRef(false);

  const [engineState, setEngineState] = useState<EngineState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadedModelId, setLoadedModelId] = useState<LlmModelId | null>(null);

  const initEngine = useCallback(async (modelId: LlmModelId) => {
    activeRunIdRef.current += 1;
    abortRequestedRef.current = false;
    setError(null);
    setProgress(0);
    setEngineState('downloading');
    setLoadedModelId(null);
    loadedModelIdRef.current = null;

    try {
      workerRef.current?.terminate();
      engineRef.current = null;

      const worker = new Worker(
        new URL('../workers/webllm.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;

      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
      const engine = await CreateWebWorkerMLCEngine(worker, modelId, {
        initProgressCallback: (report: InitProgressReport) => {
          setProgress(report.progress ?? 0);
        },
      });

      engineRef.current = engine;
      loadedModelIdRef.current = modelId;
      setLoadedModelId(modelId);
      setEngineState('ready');
      setProgress(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setEngineState('error');
    }
  }, []);

  const runPass = useCallback(
    async (
      engine: WebWorkerMLCEngine,
      text: string,
      systemPrompt: string,
      maxTokens: number,
      runId: number,
    ): Promise<string> => {
      const reply = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: maxTokens,
      });

      if (runId !== activeRunIdRef.current || abortRequestedRef.current) {
        throw new GenerationAbortedError();
      }

      const choice = reply.choices[0];
      const content = choice?.message?.content?.trim() ?? '';
      if (content) {
        return content;
      }

      const reason = choice?.finish_reason ?? 'unknown';
      if (reason === 'abort') {
        throw new GenerationAbortedError();
      }
      if (reason === 'length') {
        throw new Error('Model hit output limit. Try shorter input or switch to Llama 3.2 1B.');
      }
      throw new Error(`Empty output (finish_reason: ${reason}). Try shorter input or different model.`);
    },
    [],
  );

  const compress = useCallback(
    async (text: string, systemPrompt: string): Promise<string> => {
      const engine = engineRef.current;
      const modelId = loadedModelIdRef.current;
      if (!engine || !modelId) {
        throw new Error('Engine not initialized');
      }

      const runId = activeRunIdRef.current + 1;
      activeRunIdRef.current = runId;
      abortRequestedRef.current = false;
      setError(null);
      setEngineState('compressing');

      try {
        const plan = createCompressionPlan(text, systemPrompt, modelId);
        const chunkPrompt = `${systemPrompt}\n\nYou are compressing one chunk of a larger input. Preserve every chunk-local fact, number, requirement, negation, identifier, path, URL, and technical term. Output ONLY compressed chunk text.`;

        let output: string;
        if (!plan.chunked) {
          output = await runPass(engine, plan.chunks[0], systemPrompt, plan.maxTokens, runId);
        } else {
          const chunkOutputs: string[] = [];
          for (const chunk of plan.chunks) {
            chunkOutputs.push(await runPass(engine, chunk, chunkPrompt, plan.maxTokens, runId));
          }

          const merged = chunkOutputs.join('\n');
          const mergePlan = createCompressionPlan(merged, systemPrompt, modelId);
          output = mergePlan.chunked
            ? merged
            : await runPass(
              engine,
              merged,
              `${systemPrompt}\n\nYou are merging already-compressed chunks from a larger input. Deduplicate, keep structure dense, preserve all facts exactly, and output ONLY final text.`,
              mergePlan.maxTokens,
              runId,
            );
        }

        if (runId !== activeRunIdRef.current || abortRequestedRef.current) {
          throw new GenerationAbortedError();
        }

        setEngineState('ready');
        return output.trim();
      } catch (err) {
        if (err instanceof GenerationAbortedError) {
          setEngineState('ready');
          return '';
        }

        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setEngineState('ready');
        return '';
      }
    },
    [runPass],
  );

  const abort = useCallback(() => {
    activeRunIdRef.current += 1;
    abortRequestedRef.current = true;
    const engine = engineRef.current;
    if (engine && 'interruptGenerate' in engine) {
      engine.interruptGenerate();
    }
    setError(null);
    setEngineState((current) => (current === 'compressing' ? 'ready' : current));
  }, []);

  return { engineState, progress, error, loadedModelId, initEngine, compress, abort };
}
