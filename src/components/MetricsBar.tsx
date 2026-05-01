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

  return (
    <div className="flex flex-wrap justify-center gap-6 px-4 py-3 bg-slate-800 border-t border-slate-700">
      {processing ? (
        <span className="text-sm text-slate-400 animate-pulse">Compressing…</span>
      ) : result ? (
        <>
          <Metric label="Orig chars" value={result.metrics.originalChars.toLocaleString()} />
          <Metric label="Out chars" value={result.metrics.outputChars.toLocaleString()} />
          <Metric label="Token before" value={result.metrics.estimatedTokensBefore.toLocaleString()} />
          <Metric label="Token after" value={result.metrics.estimatedTokensAfter.toLocaleString()} />
          <Metric label="Legend OH" value={result.metrics.legendOverhead.toLocaleString()} />
          <Metric label="Net save" value={result.metrics.netCharSavingsIncludingLegend.toLocaleString()} />
          <span className={`text-xs self-center ${result.reversible ? 'text-emerald-400' : 'text-amber-400'}`}>
            {result.reversible
              ? `Reversible: ${result.validation.passed ? 'validated' : 'failed'}`
              : `Lossy: ${result.validation.validationKind}`}
          </span>
        </>
      ) : null}
    </div>
  );
}
