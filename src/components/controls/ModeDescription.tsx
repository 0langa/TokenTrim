import { getModeMeta } from '../../compression/modes';
import type { CompressionMode, RiskLevel } from '../../compression/types';

const RISK_COLORS: Record<RiskLevel, string> = {
  safe: 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-950/40',
  low: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/40',
  medium: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40',
  high: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/40',
};

interface Props {
  mode: CompressionMode;
}

export function ModeDescription({ mode }: Props) {
  const meta = getModeMeta(mode);
  return (
    <div className="mt-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${RISK_COLORS[meta.risk]}`}>
          {meta.risk} risk
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          ~{meta.expectedSavingsPct[0]}–{meta.expectedSavingsPct[1]}% savings
        </span>
      </div>
      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">{meta.description}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-snug italic">{meta.guidance}</p>
    </div>
  );
}
