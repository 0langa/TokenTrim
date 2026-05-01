import { listProfiles } from '../compression/profiles';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const OPTIONS = listProfiles();

export function IntensitySelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="px-3 py-1.5 rounded text-sm bg-slate-700 text-slate-200 border border-slate-600"
      >
        {OPTIONS.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.label}
            {profile.recommended ? ' · Recommended' : ''}
            {profile.advanced ? ' · Advanced' : ''}
          </option>
        ))}
      </select>
      <div className="text-[11px] text-slate-400">
        {OPTIONS.filter((p) => p.recommended).map((p) => p.label).join(', ')} are tuned for safe but noticeable savings.
      </div>
    </div>
  );
}
