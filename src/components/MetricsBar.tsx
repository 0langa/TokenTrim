import type { CompressionResult } from '../compression/types';

interface Props {
  result: CompressionResult | null;
  processing: boolean;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-mono font-semibold text-slate-100">{value}</span>
    </div>
  );
}

export function MetricsBar({ result, processing }: Props) {
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
          <Metric label="Tokens before" value={result.metrics.estimatedTokensBefore.toLocaleString()} />
          <Metric label="Tokens after" value={result.metrics.estimatedTokensAfter.toLocaleString()} />
          <span className="text-xs self-center text-slate-500">est. ({result.metrics.tokenizerUsed})</span>
        </>
      ) : null}
    </div>
  );
}
