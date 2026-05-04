import { COMMON_WEB_PROFILES, PROFILE_META } from '../../compression/profiles';
import type { CompressionProfile } from '../../compression/types';

interface Props {
  value: CompressionProfile;
  onChange: (v: CompressionProfile) => void;
}

export function ProfileSelect({ value, onChange }: Props) {
  const meta = PROFILE_META[value];
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
        Text type
      </label>
      <div className="grid grid-cols-2 gap-2">
        {COMMON_WEB_PROFILES.map((profile) => {
          const selected = value === profile;
          return (
            <button
              key={profile}
              type="button"
              onClick={() => onChange(profile)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                selected
                  ? 'border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-950/40 dark:text-violet-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/70'
              }`}
            >
              <span className="block text-xs font-medium leading-snug">{PROFILE_META[profile].label}</span>
            </button>
          );
        })}
      </div>
      {meta && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">{meta.description}</p>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{meta.inputType}</p>
        </div>
      )}
      <p className="text-[10px] text-slate-400 dark:text-slate-500">
        Special formats like CSV, JSONL, or XML are suggested automatically when detected.
      </p>
    </div>
  );
}
