import type { CompressionResult } from '../compression/types';
import { getModeMeta } from '../compression/modes';

interface Props {
  result: CompressionResult | null;
  processing: boolean;
  onSaveToHistory?: () => void;
  onToggleHistory?: () => void;
  historyOpen?: boolean;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function MetricsBar({ result, processing, onSaveToHistory, onToggleHistory, historyOpen }: Props) {
  if (!result && !processing) return null;

  const savingsPct = result && result.metrics.estimatedTokensBefore > 0
    ? Math.round((result.metrics.estimatedTokenSavings / result.metrics.estimatedTokensBefore) * 100)
    : 0;
  const modeLabel = result ? getModeMeta(result.mode).label : '';

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      {processing ? (
        <span className="text-sm animate-pulse text-slate-500 dark:text-slate-400">Compressing…</span>
      ) : result ? (
        <>
          {result.metrics.estimatedTokenSavings > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 dark:border-violet-800 dark:bg-violet-950/40">
              <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
                −{result.metrics.estimatedTokenSavings.toLocaleString()} tokens
              </span>
              <span className="text-xs text-violet-500 dark:text-violet-400">({savingsPct}% saved)</span>
            </div>
          )}
          <Metric label="Mode" value={modeLabel} />
          <Metric label="Input chars" value={result.metrics.originalChars.toLocaleString()} />
          <Metric label="Output chars" value={result.metrics.outputChars.toLocaleString()} />
          <Metric
            label={result.metrics.tokenizerExact ? 'Tokens before' : '~Tokens before'}
            value={result.metrics.estimatedTokensBefore.toLocaleString()}
          />
          <Metric
            label={result.metrics.tokenizerExact ? 'Tokens after' : '~Tokens after'}
            value={result.metrics.estimatedTokensAfter.toLocaleString()}
          />
          <span
            className="self-center text-xs text-slate-500 dark:text-slate-400"
            title={result.metrics.tokenizerExact ? 'Exact token count' : 'Token counts are approximate estimates — not guaranteed to match model tokenizer output'}
          >
            {result.metrics.tokenizerExact ? 'exact' : 'est.'} ({result.metrics.tokenizerUsed})
          </span>
          <div className="ml-auto flex items-center gap-1">
            {onSaveToHistory && (
              <button
                onClick={onSaveToHistory}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                title="Save to history"
              >
                <BookmarkIcon /> Save
              </button>
            )}
            {onToggleHistory && (
              <button
                onClick={onToggleHistory}
                className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
                  historyOpen
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                }`}
                title="Toggle history"
              >
                <ClockIcon /> History
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
