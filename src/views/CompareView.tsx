import { useState, useEffect } from 'react';
import { useParallelCompression } from '../hooks/useParallelCompression';
import type { TokenizerKind } from '../compression/types';
import { copyToClipboard } from '../lib/shareableUrl';

type CompareMode = 'light' | 'normal' | 'heavy' | 'ultra';

const MODES: CompareMode[] = ['light', 'normal', 'heavy', 'ultra'];

interface Props {
  tokenizer: TokenizerKind;
}

export function CompareView({ tokenizer }: Props) {
  const [input, setInput] = useState('');
  const { results, processing, run } = useParallelCompression();

  useEffect(() => {
    if (!input.trim()) {
      run('', { tokenizer, mode: 'normal' });
      return;
    }
    const id = setTimeout(() => {
      run(input, { tokenizer, mode: 'normal' });
    }, 300);
    return () => clearTimeout(id);
  }, [input, tokenizer, run]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mode Comparison</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Compare compression across all four modes side-by-side.
        </p>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <textarea
            className="w-full h-32 px-3 py-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Paste text to compare all modes…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {processing && (
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block animate-pulse">Compressing…</span>
          )}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODES.map((mode) => {
              const result = results[mode];
              return (
                <div key={mode} className="flex flex-col rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{mode}</span>
                    {result && (
                      <button
                        onClick={() => {
                          copyToClipboard(result.output).catch(() => {
                            window.alert('Clipboard access denied. Copy manually from the card output.');
                          });
                        }}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    {result ? (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Tokens</span>
                          <span className="font-mono text-slate-700 dark:text-slate-200">
                            {result.metrics.estimatedTokensBefore.toLocaleString()} → {result.metrics.estimatedTokensAfter.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Chars</span>
                          <span className="font-mono text-slate-700 dark:text-slate-200">
                            {result.metrics.originalChars > 0
                              ? `${Math.round((result.metrics.outputChars / result.metrics.originalChars) * 100)}%`
                              : '–'}
                          </span>
                        </div>
                        <pre className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded overflow-auto max-h-64 whitespace-pre-wrap break-words">
                          {result.output}
                        </pre>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">Enter text to see results.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
