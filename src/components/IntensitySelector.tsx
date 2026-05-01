import type { Intensity } from '../compression/types';

interface Props {
  value: Intensity;
  onChange: (v: Intensity) => void;
}

const OPTIONS: { value: Intensity; label: string; desc: string }[] = [
  { value: 'light', label: 'Light', desc: 'Whitespace normalization' },
  { value: 'medium', label: 'Medium', desc: 'Dictionary substitution' },
  { value: 'heavy', label: 'Heavy', desc: 'LZ encoding + dictionary' },
];

export function IntensitySelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.desc}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-violet-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
