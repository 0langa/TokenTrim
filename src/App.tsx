import { useEffect, useMemo, useState } from 'react';
import { useCompression } from './hooks/useCompression';
import { MetricsBar } from './components/MetricsBar';
import { IntensitySelector } from './components/IntensitySelector';
import { CopyButton } from './components/CopyButton';
import { getProfile } from './compression/profiles';
import { compress } from './compression/pipeline';
import type { CompressionLegend, CompressionResult } from './compression/types';
import { SAMPLE_INPUTS } from './data/samples';

const INPUT_KEY = 'tokentrim:last-input';
const PROFILE_KEY = 'tokentrim:last-profile';
const RESTORE_SESSION_KEY = 'tokentrim:restore-session';

type Tab = 'compress' | 'decode';

type BatchRow = {
  filename: string;
  output: string;
  legend: CompressionLegend | null;
  originalChars: number;
  outputChars: number;
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
  ratio: string;
  status: string;
};
type ExportFormat = 'txt' | 'md' | 'json';

const PLACEHOLDER = `Paste text to compress.

Default is Lossless Light (safe normalization).
Recommended lossy presets: Docs/README, Codebase Context, Meeting Notes.`;

const SUPPORTED = new Set(['txt', 'md', 'json', 'yaml', 'yml', 'toml', 'ts', 'tsx', 'js', 'jsx', 'py', 'css', 'html']);

function safeParseLegend(input: string): { legend: CompressionLegend | Record<string, string> | null; error: string | null } {
  if (!input.trim()) return { legend: null, error: 'missing-legend' };
  try {
    const parsed = JSON.parse(input) as CompressionLegend | Record<string, string>;
    if (typeof parsed !== 'object' || parsed === null) return { legend: null, error: 'invalid-json-shape' };
    return { legend: parsed, error: null };
  } catch {
    return { legend: null, error: 'malformed-json' };
  }
}

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
  row: { output: string; legend: CompressionLegend | null; filename?: string; profileId?: string },
  format: ExportFormat,
): { filename: string; content: string } {
  const base = row.filename ? row.filename.replace(/\.[^.]+$/, '') : 'compressed';
  if (format === 'json') {
    return {
      filename: `${base}.trim.json`,
      content: JSON.stringify(
        {
          profileId: row.profileId,
          output: row.output,
          legend: row.legend,
        },
        null,
        2,
      ),
    };
  }
  if (format === 'md') {
    return { filename: `${base}.trim.md`, content: row.output };
  }
  return { filename: `${base}.trim.txt`, content: row.output };
}

function renderDecodeError(code: string | null): string | null {
  if (!code) return null;
  if (code === 'missing-legend') return 'Legend is required for reversible restore.';
  if (code === 'malformed-json') return 'Legend JSON is malformed.';
  if (code === 'invalid-json-shape') return 'Legend JSON must be an object.';
  return code;
}

function currentVersion(): string {
  return 'v1.0.0-rc1';
}

export default function App() {
  const [tab, setTab] = useState<Tab>('compress');
  const [restoreSession, setRestoreSession] = useState<boolean>(() => localStorage.getItem(RESTORE_SESSION_KEY) !== '0');
  const [input, setInput] = useState(() => (localStorage.getItem(RESTORE_SESSION_KEY) === '0' ? '' : localStorage.getItem(INPUT_KEY) ?? ''));
  const [profileId, setProfileId] = useState(() => (localStorage.getItem(RESTORE_SESSION_KEY) === '0' ? 'lossless-light' : localStorage.getItem(PROFILE_KEY) ?? 'lossless-light'));
  const [decodeInput, setDecodeInput] = useState('');
  const [legendInput, setLegendInput] = useState('');
  const [restoredOutput, setRestoredOutput] = useState('');
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [singleExportFormat, setSingleExportFormat] = useState<ExportFormat>('txt');
  const [batchExportFormat, setBatchExportFormat] = useState<ExportFormat>('txt');
  const { result, processing, run, restore } = useCompression();

  useEffect(() => {
    localStorage.setItem(RESTORE_SESSION_KEY, restoreSession ? '1' : '0');
  }, [restoreSession]);

  useEffect(() => {
    if (!restoreSession) return;
    localStorage.setItem(INPUT_KEY, input);
  }, [input, restoreSession]);

  useEffect(() => {
    if (!restoreSession) return;
    localStorage.setItem(PROFILE_KEY, profileId);
  }, [profileId, restoreSession]);

  useEffect(() => {
    run(input, { profileId, tokenizer: 'approx-generic' });
  }, [input, profileId, run]);

  const profile = useMemo(() => getProfile(profileId), [profileId]);

  async function onRestore() {
    const parsed = safeParseLegend(legendInput);
    if (!parsed.legend) {
      setDecodeError(renderDecodeError(parsed.error));
      setRestoredOutput(decodeInput);
      return;
    }
    if ('reversible' in parsed.legend && parsed.legend.reversible === false) {
      setDecodeError('This legend indicates a lossy output; lossy transformations are not restorable.');
      setRestoredOutput(decodeInput);
      return;
    }
    const restored = await restore(decodeInput, parsed.legend);
    setRestoredOutput(restored.output);
    setDecodeError(restored.error);
  }

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
      const out = compress(text, { profileId, tokenizer: 'approx-generic' });
      rows.push({
        filename: file.name,
        output: out.output,
        legend: out.legend,
        originalChars: out.metrics.originalChars,
        outputChars: out.metrics.outputChars,
        estimatedTokensBefore: out.metrics.estimatedTokensBefore,
        estimatedTokensAfter: out.metrics.estimatedTokensAfter,
        ratio: out.metrics.originalChars > 0 ? (out.metrics.outputChars / out.metrics.originalChars).toFixed(3) : '1.000',
        status: out.validation.passed ? 'ok' : 'failed',
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    setBatchRows(rows);
  }

  async function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    await onFilesSelected(event.dataTransfer.files);
  }

  function clearLocalState() {
    localStorage.removeItem(INPUT_KEY);
    localStorage.removeItem(PROFILE_KEY);
    setInput('');
    setProfileId('lossless-light');
  }

  function renderWhatChanged(data: CompressionResult) {
    const topRemoved = data.report.removedPhrases.slice(0, 5);
    const topReplaced = data.report.replacedPhrases.slice(0, 5);

    return (
      <div className="border-t border-slate-700 p-4 text-xs grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <div className="text-slate-300 mb-1">Validation</div>
          <div>{data.validation.validationKind}</div>
          <div className="text-slate-400">{data.validation.baselineDescription}</div>
          <div className="mt-2 text-slate-500">Legend overhead: {data.metrics.legendOverhead} chars</div>
          <div className="text-slate-500">Net incl legend: {data.metrics.netCharSavingsIncludingLegend}</div>
        </div>
        <div>
          <div className="text-slate-300 mb-1">What Changed</div>
          <div className="text-slate-400">Removed: {topRemoved.length ? topRemoved.join(' | ') : 'none'}</div>
          <div className="text-slate-400 mt-1">Replaced: {topReplaced.length ? topReplaced.map((x) => `${x.before}→${x.after}`).join(' | ') : 'none'}</div>
          <div className="mt-1 text-slate-500">Risk events: {data.report.riskEvents.length}</div>
        </div>
        <div>
          <div className="text-slate-300 mb-1">Diff Preview (truncated)</div>
          <div className="max-h-28 overflow-auto text-slate-400">
            {data.report.diffPreview.length === 0 ? 'No visible rewrites.' : data.report.diffPreview.map((line, idx) => (
              <div key={`${line.before}-${idx}`}>
                {line.kind === 'remove' ? `- ${line.before}` : `~ ${line.before} -> ${line.after}`}
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
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">local only · safe-first compression · no telemetry</span>
          <span className="text-xs text-slate-500">{currentVersion()}</span>
        </div>
      </header>

      <div className="flex items-center gap-2 px-6 py-2 border-b border-slate-700">
        <button onClick={() => setTab('compress')} className={`px-3 py-1 rounded ${tab === 'compress' ? 'bg-violet-600' : 'bg-slate-700'}`}>Compress</button>
        <button onClick={() => setTab('decode')} className={`px-3 py-1 rounded ${tab === 'decode' ? 'bg-violet-600' : 'bg-slate-700'}`}>Decode / Restore</button>
      </div>

      {tab === 'compress' ? (
        <>
          <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Profile</span>
              <IntensitySelector value={profileId} onChange={setProfileId} />
            </div>
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
            <label className="text-xs text-slate-400 flex items-center gap-2">
              <input type="checkbox" checked={restoreSession} onChange={(e) => setRestoreSession(e.target.checked)} />
              Restore last session
            </label>
            <button className="text-xs px-2 py-1 rounded bg-slate-700" onClick={clearLocalState}>Clear local data</button>
            <div className="ml-auto">
              <CopyButton result={result} requireLossyConfirm={Boolean(profile?.advanced)} />
            </div>
          </div>

          <MetricsBar result={result} processing={processing} />

          <div className="px-6 py-2 text-xs text-slate-400 border-b border-slate-800">
            {profile?.description} | {profile?.audienceGuidance} | Expected token savings: {profile?.expectedSavingsPct[0]}-{profile?.expectedSavingsPct[1]}%
          </div>

          <div className="flex flex-1 overflow-hidden">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={PLACEHOLDER} className="flex-1 p-4 bg-slate-900 border-r border-slate-700 text-sm font-mono" />
            <div
              className="flex-1 overflow-auto p-4 text-sm font-mono whitespace-pre-wrap"
              onDrop={(e) => void onDrop(e)}
              onDragOver={(e) => e.preventDefault()}
            >
              {result?.output ?? ''}
              {result?.warnings.length ? <div className="mt-4 text-amber-400">{result.warnings.join(' | ')}</div> : null}
              {result?.error ? <div className="mt-4 text-red-400">{result.error}</div> : null}
              {result?.legend ? <button className="mt-3 text-xs px-2 py-1 bg-slate-700 rounded" onClick={() => download('legend.json', JSON.stringify(result.legend, null, 2))}>Download legend</button> : null}
              {result ? (
                <div className="mt-3 ml-2 inline-flex items-center gap-2">
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
                      const payload = outputForFormat(
                        { output: result.output, legend: result.legend, profileId: result.profileId },
                        singleExportFormat,
                      );
                      download(payload.filename, payload.content);
                    }}
                  >
                    Download output
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {result ? renderWhatChanged(result) : null}

          {batchRows.length > 0 ? (
            <div className="border-t border-slate-700 p-4 overflow-auto">
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                <span>Batch export format</span>
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
                            const payload = outputForFormat(
                              { output: r.output, legend: r.legend, filename: r.filename, profileId },
                              batchExportFormat,
                            );
                            download(payload.filename, payload.content);
                          }}
                        >
                          Output
                        </button>
                        {r.legend ? <button className="px-2 py-1 bg-slate-700 rounded" onClick={() => download(`${r.filename}.legend.json`, JSON.stringify(r.legend, null, 2))}>Legend</button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : (
        <div className="p-6 grid grid-cols-1 gap-3">
          <textarea value={decodeInput} onChange={(e) => setDecodeInput(e.target.value)} placeholder="Paste compressed text" className="p-3 bg-slate-900 text-sm font-mono border border-slate-700 min-h-40" />
          <textarea value={legendInput} onChange={(e) => setLegendInput(e.target.value)} placeholder="Paste legend JSON" className="p-3 bg-slate-900 text-sm font-mono border border-slate-700 min-h-40" />
          <div className="flex gap-2">
            <button onClick={() => void onRestore()} className="px-3 py-1 rounded bg-violet-600">Restore</button>
            <button onClick={() => navigator.clipboard.writeText(restoredOutput)} className="px-3 py-1 rounded bg-slate-700">Copy restored output</button>
          </div>
          {decodeError ? <div className="text-red-400 text-xs">{decodeError}</div> : null}
          <pre className="p-3 bg-slate-900 border border-slate-700 text-sm font-mono whitespace-pre-wrap">{restoredOutput}</pre>
          <div className="text-xs text-slate-400">Decode/Restore supports reversible outputs with valid legends. Lossy outputs are explicitly one-way.</div>
        </div>
      )}

      <footer className="border-t border-slate-800 px-6 py-3 text-[11px] text-slate-500">
        Guarantees: reversible profiles validate roundtrip to normalized baseline; lossy profiles are risk-scored and one-way. Privacy: all processing is local in your browser.
      </footer>
    </div>
  );
}
