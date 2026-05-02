import { listModes } from '../compression/modes';
import { TRANSFORM_REGISTRY } from '../compression/transformRegistry';
import type { CompressionMode, RiskLevel } from '../compression/types';

interface Props {
  value: CompressionMode;
  onChange: (v: CompressionMode) => void;
  enabledTransforms: string[];
  onTransformToggle: (id: string, enabled: boolean) => void;
}

const OPTIONS = listModes();

const RISK_STYLE: Record<RiskLevel, string> = {
  safe: 'text-green-400',
  low: 'text-blue-400',
  medium: 'text-yellow-400',
  high: 'text-red-400',
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
    <div className="mt-2 max-h-56 overflow-y-auto rounded border border-slate-700 bg-slate-900 p-2 space-y-1">
      {TRANSFORM_REGISTRY.map((meta) => (
        <label key={meta.id} className="flex items-start gap-2 cursor-pointer py-0.5 group">
          <input
            type="checkbox"
            className="mt-0.5 accent-violet-500"
            checked={enabledTransforms.includes(meta.id)}
            onChange={(e) => onToggle(meta.id, e.target.checked)}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-slate-200 flex items-center flex-wrap">
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
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CompressionMode)}
        className="px-3 py-1.5 rounded text-sm bg-slate-700 text-slate-200 border border-slate-600"
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
        <div className="text-[11px] text-slate-400">
          Light/Normal prioritize readability. Heavy/Ultra prioritize savings.
        </div>
      )}
    </div>
  );
}
