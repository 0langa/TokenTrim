import { useState } from 'react';
import { IntensitySelector } from '../IntensitySelector';
import { ProfileSelect } from '../controls/ProfileSelect';
import { RiskSelect } from '../controls/RiskSelect';
import { SAMPLE_INPUTS } from '../../data/samples';
import { getModeMeta } from '../../compression/modes';
import { PROFILE_META } from '../../compression/profiles';
import type { CompressionMode, CompressionProfile, RiskLevel } from '../../compression/types';
import type { CompressionRecommendation } from '../../compression/recommendations';

interface Props {
  mode: CompressionMode;
  setMode: (v: CompressionMode) => void;
  profile: CompressionProfile;
  setProfile: (v: CompressionProfile) => void;
  maxRisk: RiskLevel;
  setMaxRisk: (v: RiskLevel) => void;
  allowUnsafeTransforms: boolean;
  setAllowUnsafeTransforms: (v: boolean) => void;
  customTransforms: string[];
  toggleCustomTransform: (id: string, on: boolean) => void;
  resetCustomTransforms: () => void;
  onLoadSample: (text: string) => void;
  onUploadFiles: (files: FileList | null) => void;
  onReset: () => void;
  targetTokens?: number;
  currentTokens?: number;
  recommendation: CompressionRecommendation | null;
  onApplyRecommendation: () => void;
  fileAccept: string;
}

export function ControlsPanel({
  mode,
  setMode,
  profile,
  setProfile,
  maxRisk,
  setMaxRisk,
  allowUnsafeTransforms,
  setAllowUnsafeTransforms,
  customTransforms,
  toggleCustomTransform,
  resetCustomTransforms,
  onLoadSample,
  onUploadFiles,
  onReset,
  targetTokens,
  currentTokens,
  recommendation,
  onApplyRecommendation,
  fileAccept,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const advancedOpen = showAdvanced || mode === 'custom' || maxRisk !== 'medium' || allowUnsafeTransforms;

  return (
    <aside className="w-full xl:w-80 shrink-0 flex flex-col border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto">
      <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Options</span>
      </div>

      <div className="flex-1 p-3 space-y-5">
        {recommendation && (
          <section className="rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-900 dark:bg-violet-950/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-violet-700 dark:text-violet-300">Suggested setting</div>
                <p className="mt-1 text-[11px] leading-snug text-violet-800 dark:text-violet-200">
                  {PROFILE_META[recommendation.profile].label} + {getModeMeta(recommendation.mode).label}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-violet-800/80 dark:text-violet-200/90">
                  {recommendation.reason}
                </p>
              </div>
              <button
                type="button"
                onClick={onApplyRecommendation}
                className="shrink-0 rounded-md bg-violet-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-violet-500 transition-colors"
              >
                Use it
              </button>
            </div>
          </section>
        )}

        <section>
          <ProfileSelect value={profile} onChange={setProfile} />
        </section>

        <section>
          <IntensitySelector
            value={mode}
            onChange={setMode}
            enabledTransforms={customTransforms}
            onTransformToggle={toggleCustomTransform}
            onResetTransforms={resetCustomTransforms}
          />
        </section>

        {targetTokens && currentTokens !== undefined && (
          <section className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-500 mb-1">
              <span>Token budget</span>
              <span className={currentTokens > targetTokens ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                {currentTokens.toLocaleString()} / {targetTokens.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${currentTokens > targetTokens ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, (currentTokens / targetTokens) * 100)}%` }}
              />
            </div>
          </section>
        )}

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Input tools
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
                accept={fileAccept}
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

        <section>
          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {advancedOpen ? 'Hide advanced options' : 'Show advanced options'}
          </button>
          {advancedOpen && (
            <div className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <RiskSelect value={maxRisk} onChange={setMaxRisk} />
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowUnsafeTransforms}
                  onChange={(e) => setAllowUnsafeTransforms(e.target.checked)}
                  className="mt-0.5 accent-violet-500"
                />
                <span className="text-xs text-amber-700 dark:text-amber-300 leading-tight">
                  Allow riskier rewrites
                  <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                    Apply transforms even when safety checks recommend skipping them.
                  </span>
                </span>
              </label>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
