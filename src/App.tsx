import { useEffect, useState, type DragEvent } from 'react';
import { useCompression } from './hooks/useCompression';
import { useCustomTransforms } from './hooks/useCustomTransforms';
import { MetricsBar } from './components/MetricsBar';
import { IntensitySelector } from './components/IntensitySelector';
import { ResultTabs } from './components/ResultTabs';
import { PresetSelector } from './components/PresetSelector';
import { compress } from './compression/pipeline';
import { createCompressionReport } from './compression/reporting';
import type {
  CompressionMode,
  CompressionProfile,
  CompressionResult,
  RiskLevel,
  TokenizerKind,
} from './compression/types';
import type { Preset } from './compression/presets';
import type { ExportFormat } from './components/ResultTabs';
import { SAMPLE_INPUTS } from './data/samples';
import { listProfiles } from './compression/profiles';
import { TOKENTRIM_VERSION } from './version';

const INPUT_KEY = 'tokentrim:last-input';
const MODE_KEY = 'tokentrim:last-mode';
const GITHUB_URL = 'https://github.com/0langa/TokenTrim';

type BatchRow = {
  filename: string;
  result: CompressionResult;
  ratio: string;
  status: string;
};

const PLACEHOLDER = `Paste text to compress…

Supports prompts, logs, markdown, code, YAML, JSON, and plain text.
Pick a preset above, or tune compression strength and options below.`;

const SUPPORTED = new Set([
  'txt', 'md', 'json', 'yaml', 'yml', 'toml',
  'ts', 'tsx', 'js', 'jsx', 'py', 'css', 'html',
]);

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

export default function App() {
  const [input, setInput] = useState(() => localStorage.getItem(INPUT_KEY) ?? '');
  const [mode, setMode] = useState<CompressionMode>(
    () => (localStorage.getItem(MODE_KEY) as CompressionMode) ?? 'normal',
  );
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchExportFormat, setBatchExportFormat] = useState<ExportFormat>('txt');
  const [profile, setProfile] = useState<CompressionProfile>('general');
  const [tokenizer, setTokenizer] = useState<TokenizerKind>('approx-generic');
  const [targetTokens, setTargetTokens] = useState<string>('');
  const [maxRisk, setMaxRisk] = useState<RiskLevel>('medium');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      tokenizer,
      profile,
      targetTokens: targetTokens ? Number(targetTokens) : undefined,
      maxRisk,
      ...(mode === 'custom' ? { enabledTransforms: customTransforms } : {}),
    });
  }, [input, mode, customTransforms, run, profile, tokenizer, targetTokens, maxRisk]);

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
        mode,
        tokenizer,
        profile,
        targetTokens: targetTokens ? Number(targetTokens) : undefined,
        maxRisk,
        ...(mode === 'custom' ? { enabledTransforms: customTransforms } : {}),
      });
      rows.push({
        filename: file.name,
        result: out,
        ratio:
          out.metrics.originalChars > 0
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

  function clearLocalState() {
    localStorage.removeItem(INPUT_KEY);
    localStorage.removeItem(MODE_KEY);
    setInput('');
    setMode('normal');
    setSelectedPreset(null);
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
      totalTokensBefore: batchRows.reduce(
        (s, r) => s + r.result.metrics.estimatedTokensBefore,
        0,
      ),
      totalTokensAfter: batchRows.reduce((s, r) => s + r.result.metrics.estimatedTokensAfter, 0),
      filesWithWarnings: batchRows.filter((r) => r.result.warnings.length > 0).length,
      filesWithRejectedTransforms: batchRows.filter(
        (r) => r.result.rejectedTransforms.length > 0,
      ).length,
      mode,
      profile,
      maxRisk,
      tokenizer,
    };
    download('tokentrim-batch-summary.json', JSON.stringify(summary, null, 2));
  }

  function exportBatchAll() {
    const parts = batchRows.map((r) => `=== ${r.filename} ===\n\n${r.result.output}`);
    download('tokentrim-batch-all.txt', parts.join('\n\n' + '─'.repeat(60) + '\n\n'));
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-slate-700 px-5 py-3 flex items-center gap-4 shrink-0">
        <span className="text-xl font-bold tracking-tight text-violet-400">TokenTrim</span>
        <span className="hidden md:block text-xs text-slate-400 border-l border-slate-700 pl-4 leading-tight">
          Compress AI context locally — deterministic transforms,
          protected spans, safety validation
        </span>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-[11px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
            local · no AI · no telemetry
          </span>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            GitHub ↗
          </a>
          <span className="text-[11px] text-slate-600">v{TOKENTRIM_VERSION}</span>
        </div>
      </header>

      {/* ── Step 1: What are you compressing? ── */}
      <div className="px-5 py-2.5 bg-slate-800/60 border-b border-slate-700 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider shrink-0">
            What are you compressing?
          </span>
          <PresetSelector selected={selectedPreset} onSelect={handlePresetSelect} />
        </div>
      </div>

      {/* ── Step 2: Controls ── */}
      <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-700 shrink-0">
        <div className="flex flex-wrap items-end gap-4">
          {/* Compression strength */}
          <div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5">
              Compression strength
            </div>
            <IntensitySelector
              value={mode}
              onChange={setMode}
              enabledTransforms={customTransforms}
              onTransformToggle={toggleCustomTransform}
            />
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors pb-1.5"
            title="Use case, risk, token budget, token counter"
          >
            {showAdvanced ? '▾' : '▸'} Advanced options
          </button>

          {/* Input controls — right-aligned */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <select
              className="px-2 py-1 rounded bg-slate-700 text-xs text-slate-200"
              onChange={(e) => {
                const sample = SAMPLE_INPUTS.find((s) => s.id === e.target.value);
                if (sample) setInput(sample.text);
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Load sample
              </option>
              {SAMPLE_INPUTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <label className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-200 cursor-pointer hover:bg-slate-600 transition-colors">
              Upload files
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => void onFilesSelected(e.target.files)}
              />
            </label>
            <button
              className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              onClick={clearLocalState}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Advanced options panel */}
        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap gap-5">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">Use case</span>
              <select
                value={profile}
                onChange={(e) => {
                  setProfile(e.target.value as CompressionProfile);
                  setSelectedPreset(null);
                }}
                className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs"
                title="Selects transforms optimized for your content type"
              >
                {listProfiles().map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">
                Allowed risk
              </span>
              <select
                value={maxRisk}
                onChange={(e) => setMaxRisk(e.target.value as RiskLevel)}
                className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs"
                title="Higher risk allows more aggressive transforms. Unsafe outputs are automatically rejected."
              >
                <option value="safe">Safe</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High (aggressive)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">
                Target token budget
              </span>
              <input
                value={targetTokens}
                onChange={(e) => setTargetTokens(e.target.value)}
                placeholder="e.g. 4000"
                className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs w-24"
                title="Stop compressing when output reaches this approximate token count"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">
                Token counter
              </span>
              <select
                value={tokenizer}
                onChange={(e) => setTokenizer(e.target.value as TokenizerKind)}
                className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs"
                title="All counters return approximate estimates — not guaranteed to match model tokenizer output exactly"
              >
                <option value="approx-generic">Generic (~approx)</option>
                <option value="openai-cl100k">OpenAI cl100k (~approx)</option>
                <option value="openai-o200k">OpenAI o200k (~approx)</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {/* ── Metrics bar ── */}
      <MetricsBar result={result} processing={processing} />

      {/* ── Main split: input | result tabs ── */}
      <div
        className="flex flex-1 overflow-hidden"
        onDrop={(e) => void onDrop(e)}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Left: input */}
        <div className="flex flex-col flex-1 min-w-0">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDER}
            className="flex-1 p-4 bg-slate-900 text-sm font-mono resize-none outline-none"
            spellCheck={false}
          />
          {!input && (
            <div className="border-t border-slate-800 px-4 py-1.5 text-[11px] text-slate-600 shrink-0">
              Drag &amp; drop files · supports text, markdown, code, logs, JSON, YAML
            </div>
          )}
        </div>

        {/* Right: result tabs */}
        <ResultTabs
          result={result}
          input={input}
          onDownloadOutput={handleDownloadOutput}
          onDownloadReport={handleDownloadReport}
        />
      </div>

      {/* ── Batch results ── */}
      {batchRows.length > 0 && (
        <div className="border-t border-slate-700 p-4 overflow-auto shrink-0">
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
              <button
                className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600 transition-colors"
                onClick={exportBatchAll}
                title="All outputs in one file"
              >
                Download all
              </button>
              <button
                className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600 transition-colors"
                onClick={exportBatchSummary}
                title="Summary JSON with totals and settings"
              >
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
                  <td className="py-1 text-right text-slate-400 pr-3">
                    {r.result.metrics.originalChars.toLocaleString()}
                  </td>
                  <td className="py-1 text-right text-slate-400 pr-3">
                    {r.result.metrics.outputChars.toLocaleString()}
                  </td>
                  <td className="py-1 text-right text-slate-400 pr-3">
                    {r.result.metrics.estimatedTokensBefore.toLocaleString()}
                  </td>
                  <td className="py-1 text-right text-slate-400 pr-3">
                    {r.result.metrics.estimatedTokensAfter.toLocaleString()}
                  </td>
                  <td className="py-1 text-right text-slate-400 pr-3">{r.ratio}</td>
                  <td className="py-1 text-right pr-3">
                    <span className={r.status === 'ok' ? 'text-green-400' : 'text-red-400'}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-1 text-right">
                    <button
                      className="px-2 py-0.5 bg-slate-700 rounded mr-1 hover:bg-slate-600 transition-colors"
                      onClick={() => {
                        const payload = outputForFormat(
                          { output: r.result.output, filename: r.filename, mode: r.result.mode },
                          batchExportFormat,
                        );
                        download(payload.filename, payload.content);
                      }}
                    >
                      Output
                    </button>
                    <button
                      className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors"
                      onClick={() => {
                        const report = createCompressionReport(r.result);
                        download(
                          `${safeFilename(r.filename.replace(/\.[^.]+$/, ''))}.report.json`,
                          JSON.stringify(report, null, 2),
                        );
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

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 px-5 py-3 text-[11px] text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 shrink-0">
        <span>
          All processing runs locally in your browser — no upload, no accounts, no telemetry.
        </span>
        <span className="text-slate-700">·</span>
        <span>
          CLI:{' '}
          <code className="font-mono text-slate-500">npm install -g tokentrim</code>
        </span>
        <span className="text-slate-700">·</span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-400 transition-colors"
        >
          GitHub ↗
        </a>
        <span className="ml-auto">v{TOKENTRIM_VERSION}</span>
      </footer>
    </div>
  );
}
