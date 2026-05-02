import { PRESETS, type Preset } from '../compression/presets';

interface Props {
  selected: string | null;
  onSelect: (preset: Preset) => void;
}

export function PresetSelector({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset)}
          title={preset.description}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            selected === preset.id
              ? 'bg-violet-600 border-violet-500 text-white font-medium'
              : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-violet-500 hover:text-slate-100'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
