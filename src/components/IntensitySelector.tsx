import { listModes } from '../compression/modes';
import { TRANSFORM_REGISTRY } from '../compression/transformRegistry';
import { ModeDescription } from './controls/ModeDescription';
import type { CompressionMode, RiskLevel } from '../compression/types';

interface Props {
  value: CompressionMode;
  onChange: (v: CompressionMode) => void;
  enabledTransforms: string[];
  onTransformToggle: (id: string, enabled: boolean) => void;
}

const OPTIONS = listModes();

const RISK_STYLE: Record<RiskLevel, string> = {
  safe: 'text-green-600 dark:text-green-400',
  low: 'text-blue-600 dark:text-blue-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
};

function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span className={`ml-1.5 text-[9px] font-semibold uppercase tracking-wide ${RISK_STYLE[risk]}`}>
      {risk}
    </span>
  );
}

function TransformChecklist({
  enabledTransforms,
  onToggle,
}: {
  enabledTransforms: string[];
  onToggle: (id: string, on: boolean) => void;
}) {
  return (
    <div className="mt-2 max-h-56 overflow-y-auto rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 space-y-1">
      {TRANSFORM_REGISTRY.map((meta) => (
        <label key={meta.id} className="flex items-start gap-2 cursor-pointer py-0.5">
          <input
            type="checkbox"
            className="mt-0.5 accent-violet-500"
            checked={enabledTransforms.includes(meta.id)}
            onChange={(e) => onToggle(meta.id, e.target.checked)}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-slate-800 dark:text-slate-200 flex items-center flex-wrap">
              {meta.label}
              <RiskBadge risk={meta.risk} />
            </span>
            <span className="text-[10px] text-slate-500 leading-tight">{meta.description}</span>
          </div>
        </label>
      ))}
    </div>
  );
}

export function IntensitySelector({ value, onChange, enabledTransforms, onTransformToggle }: Props) {
  const isCustom = value === 'custom';

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
        Compression strength
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CompressionMode)}
        className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm"
      >
        {OPTIONS.map((mode) => (
          <option key={mode.id} value={mode.id}>
            {mode.label}
          </option>
        ))}
      </select>
      {isCustom ? (
        <TransformChecklist enabledTransforms={enabledTransforms} onToggle={onTransformToggle} />
      ) : (
        <ModeDescription mode={value} />
      )}
    </div>
  );
}
