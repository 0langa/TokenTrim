import { PresetSelector } from '../PresetSelector';
import { IntensitySelector } from '../IntensitySelector';
import { ProfileSelect } from '../controls/ProfileSelect';
import { RiskSelect } from '../controls/RiskSelect';
import { SAMPLE_INPUTS } from '../../data/samples';
import type { CompressionMode, CompressionProfile, RiskLevel } from '../../compression/types';
import type { Preset } from '../../compression/presets';

interface Props {
  mode: CompressionMode;
  setMode: (v: CompressionMode) => void;
  profile: CompressionProfile;
  setProfile: (v: CompressionProfile) => void;
  maxRisk: RiskLevel;
  setMaxRisk: (v: RiskLevel) => void;
  selectedPreset: string | null;
  onPresetSelect: (p: Preset) => void;
  allowUnsafeTransforms: boolean;
  setAllowUnsafeTransforms: (v: boolean) => void;
  customTransforms: string[];
  toggleCustomTransform: (id: string, on: boolean) => void;
  onLoadSample: (text: string) => void;
  onUploadFiles: (files: FileList | null) => void;
  onReset: () => void;
}

export function ControlsPanel({
  mode, setMode, profile, setProfile, maxRisk, setMaxRisk,
  selectedPreset, onPresetSelect, allowUnsafeTransforms, setAllowUnsafeTransforms,
  customTransforms, toggleCustomTransform, onLoadSample, onUploadFiles, onReset,
}: Props) {
  return (
    <aside className="w-72 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto">
      <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Controls</span>
      </div>

      <div className="flex-1 p-3 space-y-5">
        {/* Presets */}
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Quick Start
          </div>
          <PresetSelector selected={selectedPreset} onSelect={onPresetSelect} />
        </section>

        {/* Compression strength */}
        <section>
          <IntensitySelector
            value={mode}
            onChange={setMode}
            enabledTransforms={customTransforms}
            onTransformToggle={toggleCustomTransform}
          />
        </section>

        {/* Use case + risk */}
        <section className="space-y-4">
          <ProfileSelect value={profile} onChange={(v) => { setProfile(v); }} />
          <RiskSelect value={maxRisk} onChange={setMaxRisk} />
        </section>

        {/* Safety override */}
        <section>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowUnsafeTransforms}
              onChange={(e) => setAllowUnsafeTransforms(e.target.checked)}
              className="mt-0.5 accent-violet-500"
            />
            <span className="text-xs text-amber-600 dark:text-amber-300 leading-tight">
              Allow unsafe transforms
              <span className="block text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">
                Apply transforms even if safety checks flag semantic risk.
              </span>
            </span>
          </label>
        </section>

        {/* Input helpers */}
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Input
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200"
              onChange={(e) => {
                const sample = SAMPLE_INPUTS.find((s) => s.id === e.target.value);
                if (sample) onLoadSample(sample.text);
              }}
              defaultValue=""
            >
              <option value="" disabled>Load sample…</option>
              {SAMPLE_INPUTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <label className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
              Upload files
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => onUploadFiles(e.target.files)}
              />
            </label>
            <button
              className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              onClick={onReset}
            >
              Reset all
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}
