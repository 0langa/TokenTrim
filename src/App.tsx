import { useEffect, useMemo, useState } from 'react';
import { useCompression } from './hooks/useCompression';
import { MetricsBar } from './components/MetricsBar';
import { IntensitySelector } from './components/IntensitySelector';
import { CopyButton } from './components/CopyButton';
import { getProfile } from './compression/profiles';
import { compress } from './compression/pipeline';
import type { CompressionLegend } from './compression/types';

const INPUT_KEY = 'tokentrim:last-input';
const PROFILE_KEY = 'tokentrim:last-profile';

type Tab = 'compress' | 'decode';

type BatchRow = {
  filename: string;
  originalChars: number;
  outputChars: number;
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
  ratio: string;
  status: string;
};

const PLACEHOLDER = `Paste text to compress.

Profiles marked reversible are validated with roundtrip baselines.
Profiles marked lossy are one-way and risk-scored.`;

const SUPPORTED = new Set(['txt', 'md', 'json', 'yaml', 'yml', 'toml', 'ts', 'tsx', 'js', 'jsx', 'py', 'css', 'html']);

function safeParseLegend(input: string): CompressionLegend | Record<string, string> | null {
  if (!input.trim()) return null;
  try {
    return JSON.parse(input) as CompressionLegend | Record<string, string>;
  } catch {
    return null;
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('compress');
  const [input, setInput] = useState(() => localStorage.getItem(INPUT_KEY) ?? '');
  const [profileId, setProfileId] = useState(() => localStorage.getItem(PROFILE_KEY) ?? 'lossless-light');
  const [decodeInput, setDecodeInput] = useState('');
  const [legendInput, setLegendInput] = useState('');
  const [restoredOutput, setRestoredOutput] = useState('');
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const { result, processing, run, restore } = useCompression();

  useEffect(() => {
    localStorage.setItem(INPUT_KEY, input);
  }, [input]);

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, profileId);
  }, [profileId]);

  useEffect(() => {
    run(input, { profileId, tokenizer: 'approx-generic' });
  }, [input, profileId, run]);

  const profile = useMemo(() => getProfile(profileId), [profileId]);

  async function onRestore() {
    const parsed = safeParseLegend(legendInput);
    if (!parsed) {
      setDecodeError('Malformed legend JSON.');
      setRestoredOutput(decodeInput);
      return;
    }
    const restored = await restore(decodeInput, parsed);
    setRestoredOutput(restored.output);
    setDecodeError(restored.error);
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked = Array.from(files).filter((file) => SUPPORTED.has(file.name.split('.').pop()?.toLowerCase() ?? ''));
    if (picked.length === 1) {
      setInput(await picked[0].text());
      return;
    }

    const rows: BatchRow[] = [];
    for (const file of picked) {
      const text = await file.text();
      const out = compress(text, { profileId, tokenizer: 'approx-generic' });
      rows.push({
        filename: file.name,
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight text-violet-400">TokenTrim</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">local only · reversible + lossy profiles · zero telemetry</span>
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
            <input type="file" multiple onChange={(e) => void onFilesSelected(e.target.files)} className="text-xs" />
            <div className="ml-auto"><CopyButton result={result} /></div>
          </div>

          <MetricsBar result={result} processing={processing} />

          <div className="px-6 py-2 text-xs text-slate-400 border-b border-slate-800">
            {profile?.description} | Guarantee: {profile?.guarantee} | {profile?.reversible ? 'Reversible mode' : 'Lossy semantic mode'}
          </div>

          <div className="flex flex-1 overflow-hidden">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={PLACEHOLDER} className="flex-1 p-4 bg-slate-900 border-r border-slate-700 text-sm font-mono" />
            <div className="flex-1 overflow-auto p-4 text-sm font-mono whitespace-pre-wrap">
              {result?.output ?? ''}
              {result?.warnings.length ? <div className="mt-4 text-amber-400">{result.warnings.join(' | ')}</div> : null}
              {result?.error ? <div className="mt-4 text-red-400">{result.error}</div> : null}
            </div>
          </div>

          {result ? (
            <div className="border-t border-slate-700 p-4 text-xs grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-slate-300 mb-1">Validation</div>
                <div>{result.validation.validationKind}</div>
                <div className="text-slate-400">{result.validation.baselineDescription}</div>
              </div>
              <div>
                <div className="text-slate-300 mb-1">Report</div>
                <div>Protected spans: {Object.entries(result.report.protectedSpanStats).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'}</div>
                <div>Risk events: {result.report.riskEvents.length}</div>
                <div>Dictionary entries: {result.report.dictionaryEntries}</div>
              </div>
            </div>
          ) : null}

          {batchRows.length > 0 ? (
            <div className="border-t border-slate-700 p-4 overflow-auto">
              <table className="text-xs w-full">
                <thead><tr><th className="text-left">Filename</th><th>Orig chars</th><th>Out chars</th><th>Tok before</th><th>Tok after</th><th>Ratio</th><th>Status</th></tr></thead>
                <tbody>
                  {batchRows.map((r) => (
                    <tr key={r.filename} className="border-t border-slate-800">
                      <td>{r.filename}</td><td>{r.originalChars}</td><td>{r.outputChars}</td><td>{r.estimatedTokensBefore}</td><td>{r.estimatedTokensAfter}</td><td>{r.ratio}</td><td>{r.status}</td>
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
          <div className="text-xs text-slate-400">Decode/Restore only supports reversible modes with valid legends. Lossy modes are one-way by design.</div>
        </div>
      )}
    </div>
  );
}
