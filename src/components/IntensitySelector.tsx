import { useState } from 'react';
import { listModes } from '../compression/modes';
import { TRANSFORM_REGISTRY } from '../compression/transformRegistry';
import { ModeDescription } from './controls/ModeDescription';
import type { CompressionMode, RiskLevel } from '../compression/types';

interface Props {
  value: CompressionMode;
  onChange: (v: CompressionMode) => void;
  enabledTransforms: string[];
  onTransformToggle: (id: string, enabled: boolean) => void;
  onResetTransforms: () => void;
}

const OPTIONS = listModes();
const PRIMARY_MODES: CompressionMode[] = ['light', 'normal', 'heavy'];
const ADVANCED_MODES: CompressionMode[] = ['ultra', 'custom'];

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
  onReset,
}: {
  enabledTransforms: string[];
  onToggle: (id: string, on: boolean) => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
          Pick exactly which transforms run.
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Reset list
        </button>
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {TRANSFORM_REGISTRY.map((meta) => (
          <label key={meta.id} className="flex items-start gap-2 cursor-pointer py-0.5">
            <input
              type="checkbox"
              className="mt-0.5 accent-violet-500"
              checked={enabledTransforms.includes(meta.id)}
              onChange={(e) => onToggle(meta.id, e.target.checked)}
            />
            <div className="flex min-w-0 flex-col">
              <span className="flex flex-wrap items-center text-xs text-slate-800 dark:text-slate-200">
                {meta.label}
                <RiskBadge risk={meta.risk} />
              </span>
              <span className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">{meta.description}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function ModeButton({
  mode,
  selected,
  onSelect,
}: {
  mode: CompressionMode;
  selected: boolean;
  onSelect: (mode: CompressionMode) => void;
}) {
  const meta = OPTIONS.find((item) => item.id === mode)!;

  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
        selected
          ? 'border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-950/40 dark:text-violet-300'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/70'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{meta.label}</span>
        <RiskBadge risk={meta.risk} />
      </div>
      <div className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        {meta.description}
      </div>
    </button>
  );
}

export function IntensitySelector({
  value,
  onChange,
  enabledTransforms,
  onTransformToggle,
  onResetTransforms,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isCustom = value === 'custom';
  const advancedOpen = showAdvanced || value === 'ultra' || value === 'custom';

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
        Compression strength
      </label>
      <div className="grid gap-2">
        {PRIMARY_MODES.map((mode) => (
          <ModeButton key={mode} mode={mode} selected={value === mode} onSelect={onChange} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setShowAdvanced((current) => !current)}
        className="self-start text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        {advancedOpen ? 'Hide advanced modes' : 'Show advanced modes'}
      </button>
      {advancedOpen && (
        <div className="grid gap-2">
          {ADVANCED_MODES.map((mode) => (
            <ModeButton key={mode} mode={mode} selected={value === mode} onSelect={onChange} />
          ))}
        </div>
      )}
      {isCustom ? (
        <TransformChecklist
          enabledTransforms={enabledTransforms}
          onToggle={onTransformToggle}
          onReset={onResetTransforms}
        />
      ) : (
        <ModeDescription mode={value} />
      )}
    </div>
  );
}
