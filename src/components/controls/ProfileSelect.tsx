import { listProfiles, PROFILE_META } from '../../compression/profiles';
import type { CompressionProfile } from '../../compression/types';

interface Props {
  value: CompressionProfile;
  onChange: (v: CompressionProfile) => void;
}

export function ProfileSelect({ value, onChange }: Props) {
  const meta = PROFILE_META[value];
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
        Use case
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CompressionProfile)}
        className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs"
      >
        {listProfiles().map((p) => (
          <option key={p} value={p}>
            {PROFILE_META[p].label}
          </option>
        ))}
      </select>
      {meta && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
          {meta.description}
        </p>
      )}
    </div>
  );
}
