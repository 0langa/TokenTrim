import { useEffect, useState, useCallback } from 'react';
import { useWebLLM, getModelMeta } from '../hooks/useWebLLM';
import type { LlmModelId } from '../hooks/useWebLLM';
import { estimateTokens } from '../compression/tokenizers/index';

const DEFAULT_PROMPT = 'Compress the following text for an LLM context window. Preserve all facts, requirements, numbers, negations, and technical terms. Remove fluff, redundancy, and filler. Output ONLY the compressed text with no explanations.';

function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export function LlmCompressView() {
  const { engineState, progress, error, loadedModelId, initEngine, compress, abort } = useWebLLM();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [modelId, setModelId] = useState<LlmModelId>('SmolLM2-360M-Instruct-q4f16_1-MLC');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [metrics, setMetrics] = useState<{ originalTokens: number; outputTokens: number; savings: number } | null>(null);

  const systemPrompt = customPrompt.trim()
    ? `${DEFAULT_PROMPT}\n\nAdditional instruction: ${customPrompt.trim()}`
    : DEFAULT_PROMPT;

  const handleCompress = useCallback(async () => {
    if (!input.trim()) return;
    setOutput('');
    setMetrics(null);
    const result = await compress(input, systemPrompt);
    if (!result) {
      // Error already set in hook; don't overwrite empty output
      return;
    }
    setOutput(result);
    const origTok = estimateTokens(input, 'approx-generic').tokens;
    const outTok = estimateTokens(result, 'approx-generic').tokens;
    setMetrics({
      originalTokens: origTok,
      outputTokens: outTok,
      savings: origTok > 0 ? Math.round((1 - outTok / origTok) * 100) : 0,
    });
  }, [input, systemPrompt, compress]);

  useEffect(() => {
    return () => { abort(); };
  }, [abort]);

  const webgpuSupported = hasWebGPU();
  const meta = getModelMeta(modelId);
  const needsModelLoad = loadedModelId !== modelId;

  if (!webgpuSupported) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 max-w-lg text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">WebGPU Not Available</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            LLM Compression requires WebGPU, which is not supported in this browser.
            Please use Chrome 113+, Edge 113+, or Firefox with WebGPU enabled.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            You can still use the rule-based Compress tab for deterministic text compression.
          </p>
        </div>
      </div>
    );
  }

  const isBusy = engineState === 'downloading' || engineState === 'compressing';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Controls panel */}
        <aside className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Model</label>
            <select
              value={modelId}
              onChange={(e) => {
                setModelId(e.target.value as LlmModelId);
                setOutput('');
                setMetrics(null);
              }}
              disabled={isBusy}
              className="w-full text-xs px-2.5 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-50"
            >
              <option value="SmolLM2-360M-Instruct-q4f16_1-MLC">SmolLM2 360M (~130 MB)</option>
              <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama 3.2 1B (~900 MB)</option>
            </select>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{meta.desc}</p>
            {loadedModelId && (
              <p className="text-[10px] mt-1 text-slate-500 dark:text-slate-400">
                Loaded: {loadedModelId === modelId ? 'selected model ready' : 'different model loaded'}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Output style</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Default mode keeps facts and strips filler. Add one extra instruction only if needed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomPrompt((value) => !value)}
                disabled={isBusy}
                className="shrink-0 rounded-full border border-slate-300 dark:border-slate-600 px-2.5 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                {showCustomPrompt ? 'Hide' : 'Customize'}
              </button>
            </div>
            {showCustomPrompt && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Extra instruction</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Example: keep bullet points, keep headings, or prioritize action items."
                  disabled={isBusy}
                  className="w-full h-24 text-xs px-2.5 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 resize-none disabled:opacity-50"
                />
              </div>
            )}
          </div>

          <div className="mt-auto">
            {engineState === 'idle' && (
              <button
                onClick={() => initEngine(modelId)}
                className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded transition-colors"
              >
                Load Model
              </button>
            )}

            {engineState === 'downloading' && (
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
                  Downloading model… {Math.round(progress * 100)}%
                </p>
              </div>
            )}

            {engineState === 'ready' && needsModelLoad && (
              <button
                onClick={() => initEngine(modelId)}
                className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded transition-colors"
              >
                {loadedModelId ? 'Switch Model' : 'Load Model'}
              </button>
            )}

            {engineState === 'ready' && !needsModelLoad && (
              <button
                onClick={handleCompress}
                disabled={!input.trim()}
                className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-medium rounded transition-colors"
              >
                Compress with LLM
              </button>
            )}

            {engineState === 'compressing' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={abort}
                  className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded transition-colors"
                >
                  Stop
                </button>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 animate-pulse">Thinking…</span>
              </div>
            )}

            {engineState === 'error' && (
              <div className="space-y-2">
                <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={() => initEngine(modelId)}
                  className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Input panel */}
        <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-700">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Original</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2">{input.length.toLocaleString()} chars</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste text to compress with a local LLM…"
            className="flex-1 w-full p-3 text-sm font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-none outline-none"
          />
        </div>

        {/* Output panel */}
        <div className="flex-1 flex flex-col">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">LLM Output</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2">{output.length.toLocaleString()} chars</span>
            </div>
            {metrics && (
              <span className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">
                −{metrics.savings}% tokens
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-3">
            {output ? (
              <pre className="text-sm font-mono whitespace-pre-wrap text-slate-800 dark:text-slate-100">{output}</pre>
            ) : error && engineState !== 'downloading' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>
                  {modelId === 'SmolLM2-360M-Instruct-q4f16_1-MLC' && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      SmolLM2 360M is very small and often fails on complex instructions.
                      Try switching to Llama 3.2 1B for better results.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                  {engineState === 'ready'
                    ? needsModelLoad
                      ? 'Load selected model to generate'
                      : 'Click "Compress with LLM" to generate'
                    : engineState === 'idle'
                      ? 'Load a model to get started'
                      : ''}
                </p>
              </div>
            )}
          </div>
          {metrics && (
            <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
              <div className="flex gap-4 text-[10px] text-slate-500 dark:text-slate-400">
                <span>~{metrics.originalTokens.toLocaleString()} tok → ~{metrics.outputTokens.toLocaleString()} tok</span>
                <span className="text-violet-600 dark:text-violet-400 font-medium">Saved ~{(metrics.originalTokens - metrics.outputTokens).toLocaleString()} tokens</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
