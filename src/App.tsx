import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { useCompression } from './hooks/useCompression';
import { useCustomTransforms } from './hooks/useCustomTransforms';
import { MetricsBar } from './components/MetricsBar';
import { IntensitySelector } from './components/IntensitySelector';
import { CopyButton } from './components/CopyButton';
import { DiffView } from './components/DiffView';
import { compress } from './compression/pipeline';
import type { CompressionMode, CompressionResult } from './compression/types';
import { SAMPLE_INPUTS } from './data/samples';
import { getModeMeta } from './compression/modes';
import { computeWordDiff } from './lib/wordDiff';

const INPUT_KEY = 'tokentrim:last-input';
const MODE_KEY = 'tokentrim:last-mode';

type BatchRow = {
  filename: string;
  output: string;
  mode: CompressionMode;
  originalChars: number;
  outputChars: number;
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
  ratio: string;
  status: string;
};
type ExportFormat = 'txt' | 'md' | 'json';

const PLACEHOLDER = `Paste text to compress.

Modes: Light, Normal, Heavy, Ultra, Custom.
Ultra maximizes savings with reduced readability.
Custom lets you pick individual transforms.`;

const SUPPORTED = new Set(['txt', 'md', 'json', 'yaml', 'yml', 'toml', 'ts', 'tsx', 'js', 'jsx', 'py', 'css', 'html']);

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function outputForFormat(
  row: { output: string; filename?: string; mode: CompressionMode },
  format: ExportFormat,
): { filename: string; content: string } {
  const base = row.filename ? row.filename.replace(/\.[^.]+$/, '') : 'compressed';
  if (format === 'json') {
    return {
      filename: `${base}.trim.json`,
      content: JSON.stringify({ mode: row.mode, output: row.output }, null, 2),
    };
  }
  if (format === 'md') {
    return { filename: `${base}.trim.md`, content: row.output };
  }
  return { filename: `${base}.trim.txt`, content: row.output };
}

function currentVersion(): string {
  return 'v1.2.0';
}

export default function App() {
  const [input, setInput] = useState(() => localStorage.getItem(INPUT_KEY) ?? '');
  const [mode, setMode] = useState<CompressionMode>(() => (localStorage.getItem(MODE_KEY) as CompressionMode) ?? 'normal');
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [singleExportFormat, setSingleExportFormat] = useState<ExportFormat>('txt');
  const [batchExportFormat, setBatchExportFormat] = useState<ExportFormat>('txt');
  const [rightPaneView, setRightPaneView] = useState<'output' | 'diff'>('output');
  const [customTransforms, toggleCustomTransform] = useCustomTransforms();
  const { result, processing, run } = useCompression();

  useEffect(() => {
    localStorage.setItem(INPUT_KEY, input);
  }, [input]);

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    run(input, {
      mode,
      tokenizer: 'approx-generic',
      ...(mode === 'custom' ? { enabledTransforms: customTransforms } : {}),
    });
  }, [input, mode, customTransforms, run]);

  const modeMeta = useMemo(() => getModeMeta(mode), [mode]);

  const diffChunks = useMemo(() => {
    if (rightPaneView !== 'diff' || !result) return null;
    return computeWordDiff(input, result.output);
  }, [rightPaneView, input, result]);

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked = Array.from(files).filter((file) => SUPPORTED.has(file.name.split('.').pop()?.toLowerCase() ?? ''));
    if (picked.length === 1) {
      setInput(await picked[0].text());
      setBatchRows([]);
      return;
    }

    const rows: BatchRow[] = [];
    for (const file of picked) {
      const text = await file.text();
      const out = compress(text, { mode, tokenizer: 'approx-generic', ...(mode === 'custom' ? { enabledTransforms: customTransforms } : {}) });
      rows.push({
        filename: file.name,
        output: out.output,
        mode,
        originalChars: out.metrics.originalChars,
        outputChars: out.metrics.outputChars,
        estimatedTokensBefore: out.metrics.estimatedTokensBefore,
        estimatedTokensAfter: out.metrics.estimatedTokensAfter,
        ratio: out.metrics.originalChars > 0 ? (out.metrics.outputChars / out.metrics.originalChars).toFixed(3) : '1.000',
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

  function clearLocalState() {
    localStorage.removeItem(INPUT_KEY);
    localStorage.removeItem(MODE_KEY);
    setInput('');
    setMode('normal');
  }

  function renderWhatChanged(data: CompressionResult) {
    const topRemoved = data.report.removedPhrases.slice(0, 5);
    const topReplaced = data.report.replacedPhrases.slice(0, 5);

    return (
      <div className="border-t border-slate-700 p-4 text-xs grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <div className="text-slate-300 mb-1">Mode Summary</div>
          <div>{getModeMeta(data.mode).description}</div>
          <div className="text-slate-400">Expected savings: {modeMeta.expectedSavingsPct[0]}–{modeMeta.expectedSavingsPct[1]}%</div>
          <div className="mt-2 text-slate-500">Char savings: {data.metrics.charSavings}</div>
          <div className="text-slate-500">Token savings: {data.metrics.estimatedTokenSavings}</div>
        </div>
        <div>
          <div className="text-slate-300 mb-1">What Changed</div>
          <div className="text-slate-400">Removed: {topRemoved.length ? topRemoved.join(' | ') : 'none'}</div>
          <div className="text-slate-400 mt-1">Replaced: {topReplaced.length ? topReplaced.map((x) => `${x.before}→${x.after}`).join(' | ') : 'none'}</div>
          <div className="mt-2 max-h-20 overflow-auto space-y-0.5">
            {data.report.riskEvents.slice(0, 8).map((ev, i) => {
              const color = ev.category === 'safe-structural-cleanup'
                ? 'text-green-400'
                : ev.category === 'wording-change'
                  ? 'text-yellow-400'
                  : 'text-red-400';
              return (
                <div key={i} className={`${color} truncate`}>
                  {ev.before || '∅'} → {ev.after || '∅'}
                </div>
              );
            })}
            {data.report.riskEvents.length === 0 && <span className="text-slate-500">No events.</span>}
          </div>
        </div>
        <div>
          <div className="text-slate-300 mb-1">Transform Stats</div>
          <div className="max-h-28 overflow-auto space-y-0.5 text-slate-500">
            {data.report.transformStats.length === 0
              ? 'No transforms applied.'
              : data.report.transformStats.map((s) => (
                  <div key={s.transformId} className="truncate">
                    <span className="text-slate-400">{s.transformId}</span>
                    {' '}{s.replacements} change{s.replacements !== 1 ? 's' : ''}, −{s.charsSaved} chars
                  </div>
                ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl font-bold tracking-tight text-violet-400">TokenTrim</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">local only · one-way high-impact compression · no telemetry</span>
          <span className="text-xs text-slate-500">{currentVersion()}</span>
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-4 px-6 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-start gap-2">
          <span className="text-xs text-slate-400 uppercase tracking-wider mt-2">Mode</span>
          <IntensitySelector
            value={mode}
            onChange={setMode}
            enabledTransforms={customTransforms}
            onTransformToggle={toggleCustomTransform}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-1">
          <select
            className="px-2 py-1 rounded bg-slate-700 text-xs"
            onChange={(e) => {
              const sample = SAMPLE_INPUTS.find((s) => s.id === e.target.value);
              if (sample) setInput(sample.text);
            }}
            defaultValue=""
          >
            <option value="" disabled>Load sample input</option>
            {SAMPLE_INPUTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <input type="file" multiple onChange={(e) => void onFilesSelected(e.target.files)} className="text-xs" />
          <button className="text-xs px-2 py-1 rounded bg-slate-700" onClick={clearLocalState}>Clear local data</button>
        </div>
        <div className="ml-auto mt-1">
          <CopyButton result={result} requireUltraConfirm={mode === 'ultra' || mode === 'custom'} />
        </div>
      </div>

      <MetricsBar result={result} processing={processing} />

      <div className="px-6 py-2 text-xs text-slate-400 border-b border-slate-800">
        {modeMeta.description} | {modeMeta.guidance} | Expected token savings: {modeMeta.expectedSavingsPct[0]}–{modeMeta.expectedSavingsPct[1]}%
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left pane: input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={PLACEHOLDER}
          className="flex-1 p-4 bg-slate-900 border-r border-slate-700 text-sm font-mono resize-none"
        />

        {/* Right pane: output or diff */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          onDrop={(e) => void onDrop(e)}
          onDragOver={(e) => e.preventDefault()}
        >
          {/* Tab toggle */}
          <div className="flex border-b border-slate-700 bg-slate-900 shrink-0">
            <button
              onClick={() => setRightPaneView('output')}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                rightPaneView === 'output'
                  ? 'text-slate-100 border-b-2 border-violet-400 -mb-px'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Output
            </button>
            <button
              onClick={() => setRightPaneView('diff')}
              disabled={!result}
              className={`px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                rightPaneView === 'diff'
                  ? 'text-slate-100 border-b-2 border-violet-400 -mb-px'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Diff
            </button>
          </div>

          {/* Pane content */}
          <div className="flex-1 overflow-auto">
            {rightPaneView === 'diff' && diffChunks ? (
              <DiffView chunks={diffChunks} />
            ) : (
              <div className="p-4 text-sm font-mono whitespace-pre-wrap">
                {result?.output ?? ''}
                {result?.warnings.length ? <div className="mt-4 text-amber-400">{result.warnings.join(' | ')}</div> : null}
                {result?.error ? <div className="mt-4 text-red-400">{result.error}</div> : null}
                {result ? (
                  <div className="mt-3 inline-flex items-center gap-2">
                    <select
                      value={singleExportFormat}
                      onChange={(e) => setSingleExportFormat(e.target.value as ExportFormat)}
                      className="text-xs px-2 py-1 bg-slate-700 rounded"
                    >
                      <option value="txt">.txt</option>
                      <option value="md">.md</option>
                      <option value="json">.json</option>
                    </select>
                    <button
                      className="text-xs px-2 py-1 bg-slate-700 rounded"
                      onClick={() => {
                        const payload = outputForFormat({ output: result.output, mode: result.mode }, singleExportFormat);
                        download(payload.filename, payload.content);
                      }}
                    >
                      Download output
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {result ? renderWhatChanged(result) : null}

      {batchRows.length > 0 ? (
        <div className="border-t border-slate-700 p-4 overflow-auto">
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            <span>Batch mode</span>
            <span className="font-mono">{mode.toUpperCase()}</span>
            <span className="ml-4">Batch export format</span>
            <select
              value={batchExportFormat}
              onChange={(e) => setBatchExportFormat(e.target.value as ExportFormat)}
              className="text-xs px-2 py-1 bg-slate-700 rounded"
            >
              <option value="txt">.txt</option>
              <option value="md">.md</option>
              <option value="json">.json</option>
            </select>
          </div>
          <table className="text-xs w-full">
            <thead><tr><th className="text-left">Filename</th><th>Orig chars</th><th>Out chars</th><th>Tok before</th><th>Tok after</th><th>Ratio</th><th>Status</th><th>Export</th></tr></thead>
            <tbody>
              {batchRows.map((r) => (
                <tr key={r.filename} className="border-t border-slate-800">
                  <td>{r.filename}</td><td>{r.originalChars}</td><td>{r.outputChars}</td><td>{r.estimatedTokensBefore}</td><td>{r.estimatedTokensAfter}</td><td>{r.ratio}</td><td>{r.status}</td>
                  <td>
                    <button
                      className="px-2 py-1 bg-slate-700 rounded mr-1"
                      onClick={() => {
                        const payload = outputForFormat({ output: r.output, filename: r.filename, mode: r.mode }, batchExportFormat);
                        download(payload.filename, payload.content);
                      }}
                    >
                      Output
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <footer className="border-t border-slate-800 px-6 py-3 text-[11px] text-slate-500">
        One-way compression only. Light/Normal favor readability; Heavy/Ultra favor token savings. Custom: full control. Privacy: all processing is local in your browser.
      </footer>
    </div>
  );
}
