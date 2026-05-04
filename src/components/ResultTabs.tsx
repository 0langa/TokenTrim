import { useMemo, useState } from 'react';
import type { CompressionResult } from '../compression/types';
import { DiffView } from './DiffView';
import { SideBySideDiff } from './SideBySideDiff';
import { SafetyReviewPanel } from './SafetyReviewPanel';
import { TransformStatsPanel } from './TransformStatsPanel';
import { ReportPanel } from './ReportPanel';
import { CopyButton } from './CopyButton';
import { HighlightedOutput } from './HighlightedOutput';
import { computeWordDiff } from '../lib/wordDiff';

type Tab = 'output' | 'diff' | 'safety' | 'transforms' | 'report';
export type ExportFormat = 'txt' | 'md' | 'json';

interface Props {
  result: CompressionResult | null;
  input: string;
  onDownloadOutput: (format: ExportFormat) => void;
  onDownloadReport: () => void;
}

function EmptyHowItWorks() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-14 text-center gap-4">
      <div className="text-slate-300 font-semibold text-base">How it works</div>
      <ol className="text-xs text-slate-400 space-y-2.5 text-left max-w-xs">
        <li className="flex gap-2.5">
          <span className="text-violet-400 font-bold shrink-0">1</span>
          <span>Choose what you're compressing — pick a preset above</span>
        </li>
        <li className="flex gap-2.5">
          <span className="text-violet-400 font-bold shrink-0">2</span>
          <span>Paste text on the left or drag and drop files</span>
        </li>
        <li className="flex gap-2.5">
          <span className="text-violet-400 font-bold shrink-0">3</span>
          <span>Review output, diff, safety checks, and transform details here</span>
        </li>
        <li className="flex gap-2.5">
          <span className="text-violet-400 font-bold shrink-0">4</span>
          <span>Copy or download the compressed result</span>
        </li>
      </ol>
      <p className="text-[11px] text-slate-600 border-t border-slate-800 pt-4 max-w-xs">
        All processing runs locally in your browser. No upload, no AI, no telemetry.
      </p>
    </div>
  );
}

function TabEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center flex-1 text-slate-500 text-sm px-6 py-12">
      {children}
    </div>
  );
}

function getSafetyDotClass(result: CompressionResult): string {
  const errors = result.safetyIssues.filter((i) => i.severity === 'error');
  if (errors.length > 0) return 'bg-red-400';
  if (result.rejectedTransforms.length > 0) return 'bg-amber-400';
  if (result.safetyIssues.length > 0) return 'bg-yellow-400';
  return 'bg-green-400';
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'output', label: 'Output' },
  { id: 'diff', label: 'Diff' },
  { id: 'safety', label: 'Safety' },
  { id: 'transforms', label: 'Transforms' },
  { id: 'report', label: 'Report' },
];

export function ResultTabs({ result, input, onDownloadOutput, onDownloadReport }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('output');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('txt');
  const [diffLayout, setDiffLayout] = useState<'inline' | 'side'>('inline');

  const diffChunks = useMemo(() => {
    if (activeTab !== 'diff' || !result || !input) return null;
    return computeWordDiff(input, result.output);
  }, [activeTab, result, input]);

  const safetyDotClass = result ? getSafetyDotClass(result) : '';
  const hasResult = result !== null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden border-l border-slate-700">
      {/* Tab bar */}
      <div className="flex border-b border-slate-700 bg-slate-900 shrink-0 items-stretch">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          const disabled = !hasResult && tab.id !== 'output';
          return (
            <button
              key={tab.id}
              onClick={() => !disabled && setActiveTab(tab.id)}
              disabled={disabled}
              className={`px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5 border-b-2 disabled:opacity-30 disabled:cursor-not-allowed ${
                active
                  ? 'border-violet-400 text-slate-100'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {tab.id === 'safety' && result && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${safetyDotClass}`} />
              )}
              {tab.id === 'transforms' && result && result.report.transformStats.length > 0 && (
                <span className="text-[10px] text-slate-600">
                  {result.report.transformStats.length}
                </span>
              )}
            </button>
          );
        })}
        {result && (
          <div className="ml-auto px-3 flex items-center">
            <CopyButton
              result={result}
              requireUltraConfirm={result.mode === 'ultra' || result.mode === 'custom'}
            />
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Output */}
        {activeTab === 'output' &&
          (hasResult ? (
            <div className="p-4 text-sm font-mono flex-1 overflow-auto">
              <HighlightedOutput text={result!.output} />
              {result!.warnings.length > 0 && (
                <div className="mt-4 text-amber-400 text-xs font-sans">
                  {result!.warnings.join(' | ')}
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2 items-center font-sans">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                  className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-200"
                >
                  <option value="txt">.txt</option>
                  <option value="md">.md</option>
                  <option value="json">.json</option>
                </select>
                <button
                  className="text-xs px-3 py-1.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors text-slate-200"
                  onClick={() => onDownloadOutput(exportFormat)}
                >
                  Download output
                </button>
                <button
                  className="text-xs px-3 py-1.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors text-slate-200"
                  onClick={onDownloadReport}
                  title="Full JSON with safety issues, rejected transforms, token metrics, and timing"
                >
                  Download report JSON
                </button>
              </div>
            </div>
          ) : (
            <EmptyHowItWorks />
          ))}

        {/* Diff */}
        {activeTab === 'diff' &&
          (diffChunks ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700 bg-slate-900 shrink-0">
                <button
                  onClick={() => setDiffLayout('inline')}
                  className={`text-[11px] px-2 py-0.5 rounded transition-colors ${diffLayout === 'inline' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Inline
                </button>
                <button
                  onClick={() => setDiffLayout('side')}
                  className={`text-[11px] px-2 py-0.5 rounded transition-colors ${diffLayout === 'side' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Side-by-side
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {diffLayout === 'inline' ? <DiffView chunks={diffChunks} /> : <SideBySideDiff chunks={diffChunks} />}
              </div>
            </div>
          ) : (
            <TabEmptyState>Compress something to see what changed.</TabEmptyState>
          ))}

        {/* Safety */}
        {activeTab === 'safety' &&
          (hasResult ? (
            <SafetyReviewPanel result={result!} />
          ) : (
            <TabEmptyState>No result yet.</TabEmptyState>
          ))}

        {/* Transforms */}
        {activeTab === 'transforms' &&
          (hasResult ? (
            <TransformStatsPanel result={result!} />
          ) : (
            <TabEmptyState>No result yet.</TabEmptyState>
          ))}

        {/* Report */}
        {activeTab === 'report' &&
          (hasResult ? (
            <ReportPanel result={result!} onDownload={onDownloadReport} />
          ) : (
            <TabEmptyState>No result yet.</TabEmptyState>
          ))}
      </div>
    </div>
  );
}
