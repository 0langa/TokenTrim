import { listModes } from '../compression/modes';
import type { CompressionMode } from '../compression/types';

interface Props {
  value: CompressionMode;
  onChange: (v: CompressionMode) => void;
}

const OPTIONS = listModes();

export function IntensitySelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
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
      <div className="text-[11px] text-slate-400">Light/Normal prioritize readability. Heavy/Ultra prioritize savings.</div>
    </div>
  );
}
