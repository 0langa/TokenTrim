import type { CompressionResult, RiskLevel } from '../compression/types';
import { getModeMeta } from '../compression/modes';

const RISK_COLOR: Record<RiskLevel, string> = {
  safe: 'text-green-600 dark:text-green-400',
  low: 'text-blue-600 dark:text-blue-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  high: 'text-red-600 dark:text-red-400',
};

interface Props {
  result: CompressionResult;
}

export function TransformStatsPanel({ result }: Props) {
  const { transformStats } = result.report;
  const modeMeta = getModeMeta(result.mode);
  const totalSaved = transformStats.reduce((s, t) => s + t.charsSaved, 0);

  if (transformStats.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        <span>No transforms applied</span>
        <span className="text-xs">in {modeMeta.label.toLowerCase()} mode for this text type</span>
      </div>
    );
  }

  const sorted = [...transformStats].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0));

  return (
    <div className="p-4 text-xs space-y-3 overflow-auto">
      {/* Summary */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-slate-200 pb-3 text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span>{transformStats.length} transform{transformStats.length !== 1 ? 's' : ''} applied</span>
        {totalSaved > 0 && <span>−{totalSaved.toLocaleString()} chars saved</span>}
        {result.durationMs !== undefined && <span>{result.durationMs.toFixed(1)}ms total</span>}
        <span className="text-slate-500 dark:text-slate-400">
          {modeMeta.label} mode · {modeMeta.expectedSavingsPct[0]}–{modeMeta.expectedSavingsPct[1]}% expected savings
        </span>
      </div>

      {/* Table */}
      <table className="w-full text-left">
        <thead>
          <tr className="text-slate-500 dark:text-slate-400">
            <th className="pb-1.5 font-normal pr-4">Transform</th>
            <th className="pb-1.5 font-normal text-right pr-4">Changes</th>
            <th className="pb-1.5 font-normal text-right pr-4">−Chars</th>
            <th className="pb-1.5 font-normal text-right pr-4">Risk</th>
            <th className="pb-1.5 font-normal text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.transformId} className="border-t border-slate-200/80 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/20">
              <td className="py-1.5 pr-4 font-mono text-slate-700 dark:text-slate-300">{s.transformId}</td>
              <td className="py-1.5 pr-4 text-right text-slate-500 dark:text-slate-400">{s.replacements}</td>
              <td className="py-1.5 pr-4 text-right text-slate-500 dark:text-slate-400">
                {s.charsSaved > 0 ? `−${s.charsSaved}` : '0'}
              </td>
              <td className={`py-1.5 text-right pr-4 ${RISK_COLOR[s.risk]}`}>{s.risk}</td>
              <td className="py-1.5 text-right text-slate-500 dark:text-slate-400">
                {s.durationMs !== undefined ? `${s.durationMs.toFixed(1)}ms` : '–'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Rejected transforms */}
      {result.rejectedTransforms.length > 0 && (
        <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
          <div className="mb-1.5 text-slate-500 dark:text-slate-400">Rejected — safety check failed, not applied to output</div>
          <div className="space-y-0.5">
            {result.rejectedTransforms.map((id) => (
              <div key={id} className="font-mono text-red-600 dark:text-red-400">{id}</div>
            ))}
          </div>
        </div>
      )}

      {/* Risk events sample */}
      {result.report.riskEvents.length > 0 && (
        <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
          <div className="mb-1.5 text-slate-500 dark:text-slate-400">Sample changes</div>
          <div className="max-h-24 overflow-auto space-y-0.5">
            {result.report.riskEvents.slice(0, 12).map((ev, i) => {
              const color =
                ev.category === 'safe-structural-cleanup'
                  ? 'text-green-600 dark:text-green-400'
                  : ev.category === 'wording-change'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-amber-600 dark:text-amber-400';
              return (
                <div key={i} className={`${color} truncate font-mono`}>
                  {ev.before || '∅'} → {ev.after || '∅'}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
