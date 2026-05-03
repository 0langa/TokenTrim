import { PRESETS, type Preset } from '../compression/presets';

interface Props {
  selected: string | null;
  onSelect: (preset: Preset) => void;
}

export function PresetSelector({ selected, onSelect }: Props) {
  const activePreset = PRESETS.find((p) => p.id === selected) ?? null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              selected === preset.id
                ? 'bg-violet-600 border-violet-500 text-white font-medium'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-violet-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {activePreset && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
          {activePreset.description}
        </p>
      )}
    </div>
  );
}
