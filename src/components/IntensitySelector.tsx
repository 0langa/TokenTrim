import { listProfiles } from '../compression/profiles';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const OPTIONS = listProfiles();

export function IntensitySelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="px-3 py-1.5 rounded text-sm bg-slate-700 text-slate-200 border border-slate-600"
    >
      {OPTIONS.map((profile) => (
        <option key={profile.id} value={profile.id}>
          {profile.label} - {profile.reversible ? 'reversible' : 'lossy'}
        </option>
      ))}
    </select>
  );
}
