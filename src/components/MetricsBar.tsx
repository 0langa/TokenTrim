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

  const ratio = result ? `${(result.ratio * 100).toFixed(1)}%` : '—';
  const saved = result ? `${((1 - result.ratio) * 100).toFixed(1)}%` : '—';
  const origChars = result ? result.originalChars.toLocaleString() : '—';
  const outChars = result ? result.outputChars.toLocaleString() : '—';
  const origWords = result ? result.originalWords.toLocaleString() : '—';
  const outWords = result ? result.outputWords.toLocaleString() : '—';

  return (
    <div className="flex flex-wrap justify-center gap-6 px-4 py-3 bg-slate-800 border-t border-slate-700">
      {processing ? (
        <span className="text-sm text-slate-400 animate-pulse">Compressing…</span>
      ) : (
        <>
          <Metric label="Size ratio" value={ratio} />
          <Metric label="Saved" value={saved} />
          <Metric label="Orig chars" value={origChars} />
          <Metric label="Out chars" value={outChars} />
          <Metric label="Orig words" value={origWords} />
          <Metric label="Out words" value={outWords} />
          {result && !result.passed && (
            <span className="text-xs text-red-400 self-center">⚠ {result.error}</span>
          )}
          {result?.passed && (
            <span className="text-xs text-emerald-400 self-center">✓ Parity OK</span>
          )}
        </>
      )}
    </div>
  );
}
