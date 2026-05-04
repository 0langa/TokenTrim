import type { CompressionResult } from '../compression/types';

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
      <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-mono font-semibold text-slate-100">{value}</span>
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

  return (
    <div className="flex flex-wrap justify-center items-center gap-6 px-4 py-3 bg-slate-800 border-t border-slate-700">
      {processing ? (
        <span className="text-sm text-slate-400 animate-pulse">Compressing…</span>
      ) : result ? (
        <>
          {result.metrics.estimatedTokenSavings > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-violet-900/50 border border-violet-700">
              <span className="text-violet-300 font-bold text-sm">
                −{result.metrics.estimatedTokenSavings.toLocaleString()} tokens
              </span>
              <span className="text-violet-400 text-xs">({savingsPct}% saved)</span>
            </div>
          )}
          <Metric label="Mode" value={result.mode.toUpperCase()} />
          <Metric label="Orig chars" value={result.metrics.originalChars.toLocaleString()} />
          <Metric label="Out chars" value={result.metrics.outputChars.toLocaleString()} />
          <Metric
            label={result.metrics.tokenizerExact ? 'Tokens before' : '~Tokens before'}
            value={result.metrics.estimatedTokensBefore.toLocaleString()}
          />
          <Metric
            label={result.metrics.tokenizerExact ? 'Tokens after' : '~Tokens after'}
            value={result.metrics.estimatedTokensAfter.toLocaleString()}
          />
          <span
            className="text-xs self-center text-slate-500"
            title={result.metrics.tokenizerExact ? 'Exact token count' : 'Token counts are approximate estimates — not guaranteed to match model tokenizer output'}
          >
            {result.metrics.tokenizerExact ? 'exact' : 'est.'} ({result.metrics.tokenizerUsed})
          </span>
          <div className="ml-auto flex items-center gap-1">
            {onSaveToHistory && (
              <button
                onClick={onSaveToHistory}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                title="Save to history"
              >
                <BookmarkIcon /> Save
              </button>
            )}
            {onToggleHistory && (
              <button
                onClick={onToggleHistory}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${historyOpen ? 'text-slate-200 bg-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
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
