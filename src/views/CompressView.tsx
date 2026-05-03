import { useEffect, useState, type DragEvent } from 'react';
import { useCompression } from '../hooks/useCompression';
import { useCustomTransforms } from '../hooks/useCustomTransforms';
import { MetricsBar } from '../components/MetricsBar';
import { ResultTabs } from '../components/ResultTabs';
import { ControlsPanel } from '../components/workspace/ControlsPanel';
import { InputPanel } from '../components/workspace/InputPanel';
import { compress } from '../compression/pipeline';
import { createCompressionReport } from '../compression/reporting';
import type {
  CompressionMode,
  CompressionProfile,
  CompressionResult,
  RiskLevel,
  TokenizerKind,
} from '../compression/types';
import type { Preset } from '../compression/presets';
import type { ExportFormat } from '../components/ResultTabs';
import { TOKENTRIM_VERSION } from '../version';

const INPUT_KEY = 'tokentrim:last-input';
const MODE_KEY = 'tokentrim:last-mode';

const SUPPORTED = new Set([
  'txt', 'md', 'json', 'yaml', 'yml', 'toml',
  'ts', 'tsx', 'js', 'jsx', 'py', 'css', 'html',
]);

type BatchRow = {
  filename: string;
  result: CompressionResult;
  ratio: string;
  status: string;
};

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function outputForFormat(
  row: { output: string; filename?: string; mode: CompressionMode },
  format: ExportFormat,
): { filename: string; content: string } {
  const base = row.filename ? row.filename.replace(/\.[^.]+$/, '') : 'compressed';
  if (format === 'json') {
    return {
      filename: `${safeFilename(base)}.trim.json`,
      content: JSON.stringify({ mode: row.mode, output: row.output }, null, 2),
    };
  }
  if (format === 'md') {
    return { filename: `${safeFilename(base)}.trim.md`, content: row.output };
  }
  return { filename: `${safeFilename(base)}.trim.txt`, content: row.output };
}

interface Props {
  tokenizer: TokenizerKind;
  targetTokens: string;
  allowUnsafeTransforms: boolean;
  setAllowUnsafeTransforms: (v: boolean) => void;
  onResetAppSettings: () => void;
}

export function CompressView({
  tokenizer,
  targetTokens,
  allowUnsafeTransforms,
  setAllowUnsafeTransforms,
  onResetAppSettings,
}: Props) {
  const [input, setInput] = useState(() => localStorage.getItem(INPUT_KEY) ?? '');
  const [mode, setMode] = useState<CompressionMode>(
    () => (localStorage.getItem(MODE_KEY) as CompressionMode) ?? 'normal',
  );
  const [profile, setProfile] = useState<CompressionProfile>('general');
  const [maxRisk, setMaxRisk] = useState<RiskLevel>('medium');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchExportFormat, setBatchExportFormat] = useState<ExportFormat>('txt');
  const [customTransforms, toggleCustomTransform] = useCustomTransforms();
  const { result, processing, run } = useCompression();

  useEffect(() => { localStorage.setItem(INPUT_KEY, input); }, [input]);
  useEffect(() => { localStorage.setItem(MODE_KEY, mode); }, [mode]);

  useEffect(() => {
    run(input, {
      mode, tokenizer, profile,
      targetTokens: targetTokens ? Number(targetTokens) : undefined,
      maxRisk, allowUnsafeTransforms,
      ...(mode === 'custom' ? { enabledTransforms: customTransforms } : {}),
    });
  }, [input, mode, customTransforms, run, profile, tokenizer, targetTokens, maxRisk, allowUnsafeTransforms]);

  function handlePresetSelect(preset: Preset) {
    setProfile(preset.profile);
    setMode(preset.mode);
    setMaxRisk(preset.maxRisk);
    setSelectedPreset(preset.id);
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked = Array.from(files).filter((file) =>
      SUPPORTED.has(file.name.split('.').pop()?.toLowerCase() ?? ''),
    );
    if (picked.length === 1) {
      setInput(await picked[0].text());
      setBatchRows([]);
      return;
    }
    const rows: BatchRow[] = [];
    for (const file of picked) {
      const text = await file.text();
      const out = compress(text, {
        mode, tokenizer, profile,
        targetTokens: targetTokens ? Number(targetTokens) : undefined,
        maxRisk, allowUnsafeTransforms,
        ...(mode === 'custom' ? { enabledTransforms: customTransforms } : {}),
      });
      rows.push({
        filename: file.name,
        result: out,
        ratio: out.metrics.originalChars > 0
          ? (out.metrics.outputChars / out.metrics.originalChars).toFixed(3)
          : '1.000',
        status: out.error ? 'failed' : 'ok',
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    setBatchRows(rows);
  }

  async function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    await onFilesSelected(event.dataTransfer.files);
  }

  function handleReset() {
    localStorage.removeItem(INPUT_KEY);
    localStorage.removeItem(MODE_KEY);
    setInput('');
    setMode('normal');
    setSelectedPreset(null);
    setProfile('general');
    setMaxRisk('medium');
    setBatchRows([]);
    onResetAppSettings();
  }

  function handleDownloadOutput(format: ExportFormat) {
    if (!result) return;
    const payload = outputForFormat({ output: result.output, mode: result.mode }, format);
    download(payload.filename, payload.content);
  }

  function handleDownloadReport() {
    if (!result) return;
    const report = createCompressionReport(result);
    download('tokentrim-report.json', JSON.stringify(report, null, 2));
  }

  function exportBatchSummary() {
    const summary = {
      version: TOKENTRIM_VERSION,
      fileCount: batchRows.length,
      totalCharsBefore: batchRows.reduce((s, r) => s + r.result.metrics.originalChars, 0),
      totalCharsAfter: batchRows.reduce((s, r) => s + r.result.metrics.outputChars, 0),
      totalTokensBefore: batchRows.reduce((s, r) => s + r.result.metrics.estimatedTokensBefore, 0),
      totalTokensAfter: batchRows.reduce((s, r) => s + r.result.metrics.estimatedTokensAfter, 0),
      filesWithWarnings: batchRows.filter((r) => r.result.warnings.length > 0).length,
      filesWithRejectedTransforms: batchRows.filter((r) => r.result.rejectedTransforms.length > 0).length,
      mode, profile, maxRisk, tokenizer, allowUnsafeTransforms,
    };
    download('tokentrim-batch-summary.json', JSON.stringify(summary, null, 2));
  }

  function exportBatchAll() {
    const parts = batchRows.map((r) => `=== ${r.filename} ===\n\n${r.result.output}`);
    download('tokentrim-batch-all.txt', parts.join('\n\n' + '─'.repeat(60) + '\n\n'));
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <MetricsBar result={result} processing={processing} />

      <div
        className="flex flex-1 overflow-hidden"
        onDrop={(e) => void onDrop(e)}
        onDragOver={(e) => e.preventDefault()}
      >
        <ControlsPanel
          mode={mode}
          setMode={setMode}
          profile={profile}
          setProfile={(v) => { setProfile(v); setSelectedPreset(null); }}
          maxRisk={maxRisk}
          setMaxRisk={setMaxRisk}
          selectedPreset={selectedPreset}
          onPresetSelect={handlePresetSelect}
          allowUnsafeTransforms={allowUnsafeTransforms}
          setAllowUnsafeTransforms={setAllowUnsafeTransforms}
          customTransforms={customTransforms}
          toggleCustomTransform={toggleCustomTransform}
          onLoadSample={setInput}
          onUploadFiles={(files) => void onFilesSelected(files)}
          onReset={handleReset}
        />

        <InputPanel value={input} onChange={setInput} />

        <ResultTabs
          result={result}
          input={input}
          onDownloadOutput={handleDownloadOutput}
          onDownloadReport={handleDownloadReport}
        />
      </div>

      {batchRows.length > 0 && (
        <div className="border-t border-slate-700 p-4 overflow-auto shrink-0 bg-slate-900 text-slate-100">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-slate-300">
              Batch — {batchRows.length} file{batchRows.length !== 1 ? 's' : ''}
            </span>
            <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
              {mode.toUpperCase()}
            </span>
            <div className="ml-auto flex items-center gap-2 text-slate-400">
              <span>Export as:</span>
              <select
                value={batchExportFormat}
                onChange={(e) => setBatchExportFormat(e.target.value as ExportFormat)}
                className="text-xs px-2 py-1 bg-slate-700 rounded"
              >
                <option value="txt">.txt</option>
                <option value="md">.md</option>
                <option value="json">.json</option>
              </select>
              <button className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600 transition-colors" onClick={exportBatchAll}>
                Download all
              </button>
              <button className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600 transition-colors" onClick={exportBatchSummary}>
                Summary JSON
              </button>
            </div>
          </div>
          <table className="text-xs w-full">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="pb-1 font-normal">File</th>
                <th className="pb-1 font-normal text-right pr-3">Chars in</th>
                <th className="pb-1 font-normal text-right pr-3">Chars out</th>
                <th className="pb-1 font-normal text-right pr-3">~Tok in</th>
                <th className="pb-1 font-normal text-right pr-3">~Tok out</th>
                <th className="pb-1 font-normal text-right pr-3">Ratio</th>
                <th className="pb-1 font-normal text-right pr-3">Status</th>
                <th className="pb-1 font-normal text-right">Export</th>
              </tr>
            </thead>
            <tbody>
              {batchRows.map((r) => (
                <tr key={r.filename} className="border-t border-slate-800/50 hover:bg-slate-800/20">
                  <td className="py-1 font-mono text-slate-300">{r.filename}</td>
                  <td className="py-1 text-right text-slate-400 pr-3">{r.result.metrics.originalChars.toLocaleString()}</td>
                  <td className="py-1 text-right text-slate-400 pr-3">{r.result.metrics.outputChars.toLocaleString()}</td>
                  <td className="py-1 text-right text-slate-400 pr-3">{r.result.metrics.estimatedTokensBefore.toLocaleString()}</td>
                  <td className="py-1 text-right text-slate-400 pr-3">{r.result.metrics.estimatedTokensAfter.toLocaleString()}</td>
                  <td className="py-1 text-right text-slate-400 pr-3">{r.ratio}</td>
                  <td className="py-1 text-right pr-3">
                    <span className={r.status === 'ok' ? 'text-green-400' : 'text-red-400'}>{r.status}</span>
                  </td>
                  <td className="py-1 text-right">
                    <button
                      className="px-2 py-0.5 bg-slate-700 rounded mr-1 hover:bg-slate-600 transition-colors"
                      onClick={() => {
                        const payload = outputForFormat({ output: r.result.output, filename: r.filename, mode: r.result.mode }, batchExportFormat);
                        download(payload.filename, payload.content);
                      }}
                    >
                      Output
                    </button>
                    <button
                      className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors"
                      onClick={() => {
                        const report = createCompressionReport(r.result);
                        download(`${safeFilename(r.filename.replace(/\.[^.]+$/, ''))}.report.json`, JSON.stringify(report, null, 2));
                      }}
                    >
                      Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
