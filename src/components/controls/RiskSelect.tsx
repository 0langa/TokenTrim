import type { RiskLevel } from '../../compression/types';

const RISK_META: Record<RiskLevel, { label: string; description: string }> = {
  safe: {
    label: 'Safe',
    description: 'Structure only. Best when exact wording must stay almost untouched.',
  },
  low: {
    label: 'Low',
    description: 'Light wording cleanup. Good default for most careful use.',
  },
  medium: {
    label: 'Medium',
    description: 'Stronger rewriting. Better savings, still meant to preserve meaning.',
  },
  high: {
    label: 'High',
    description: 'Maximum squeeze. Best only when you will review output manually.',
  },
};

interface Props {
  value: RiskLevel;
  onChange: (v: RiskLevel) => void;
}

export function RiskSelect({ value, onChange }: Props) {
  const meta = RISK_META[value];
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
        Allowed risk
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as RiskLevel)}
        className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs"
      >
        <option value="safe">Safe</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      {meta && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
          {meta.description}
        </p>
      )}
    </div>
  );
}
