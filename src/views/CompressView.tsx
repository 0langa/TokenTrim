import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useCompression } from '../hooks/useCompression';
import { useCustomTransforms } from '../hooks/useCustomTransforms';
import { useCompressionHistory } from '../hooks/useCompressionHistory';
import { decodeState, updateBrowserUrl } from '../lib/shareableUrl';
import { MetricsBar } from '../components/MetricsBar';
import { ResultTabs } from '../components/ResultTabs';
import { ControlsPanel } from '../components/workspace/ControlsPanel';
import { InputPanel } from '../components/workspace/InputPanel';
import { HistoryPanel } from '../components/workspace/HistoryPanel';
import { LargeFileWarning } from '../components/LargeFileWarning';
import { createCompressionReport } from '../compression/reporting';
import type {
  CompressionOptions,
  CompressionMode,
  CompressionProfile,
  CompressionResult,
  RiskLevel,
  TokenizerKind,
  ProtectedSpanStats,
  CompressionWorkerRequest,
  CompressionWorkerResponse,
} from '../compression/types';
import type { ExportFormat } from '../components/ResultTabs';
import type { CompressionRecommendation } from '../compression/recommendations';
import { getRecommendationForFilename, getRecommendationForText } from '../compression/recommendations';
import { TOKENTRIM_VERSION } from '../version';

const INPUT_KEY = 'tokentrim:last-input';
const MODE_KEY = 'tokentrim:last-mode';
const INPUT_SAVE_DEBOUNCE_MS = 200;
const FILE_ACCEPT = [
  '.txt', '.md', '.mdx', '.json', '.yaml', '.yml', '.toml',
  '.ts', '.tsx', '.js', '.jsx', '.py', '.css', '.html', '.htm',
  '.xml', '.svg', '.csv', '.tsv', '.log', '.out', '.err',
  '.java', '.go', '.rs', '.sh', '.bash', '.zsh',
].join(',');

const URL_STATE = typeof window !== 'undefined' ? decodeState(window.location.search) : null;

const SUPPORTED = new Set([
  'txt', 'md', 'mdx', 'json', 'yaml', 'yml', 'toml',
  'ts', 'tsx', 'js', 'jsx', 'py', 'css', 'html', 'htm',
  'xml', 'svg', 'csv', 'tsv', 'log', 'out', 'err',
  'java', 'go', 'rs', 'sh', 'bash', 'zsh',
]);

type BatchRow = {
  filename: string;
  result: CompressionResult;
  ratio: string;
  status: string;
};

type PendingBatchRequest = {
  resolve: (result: CompressionResult) => void;
  reject: (error: Error) => void;
};

function readStoredString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
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
  const [input, setInput] = useState(() => URL_STATE?.input ?? readStoredString(INPUT_KEY) ?? '');
  const [mode, setMode] = useState<CompressionMode>(
    () => URL_STATE?.mode ?? (readStoredString(MODE_KEY) as CompressionMode) ?? 'normal',
  );
  const [profile, setProfile] = useState<CompressionProfile>(URL_STATE?.profile ?? 'general');
  const [maxRisk, setMaxRisk] = useState<RiskLevel>(URL_STATE?.maxRisk ?? 'medium');
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchExportFormat, setBatchExportFormat] = useState<ExportFormat>('txt');
  const [ackedLength, setAckedLength] = useState(0);
  const [customTransforms, toggleCustomTransform, resetCustomTransforms] = useCustomTransforms();
  const { result, processing, run } = useCompression();
  const { history, open: historyOpen, setOpen: setHistoryOpen, addEntry, removeEntry, clearHistory } = useCompressionHistory();
  const batchWorkerRef = useRef<Worker | null>(null);
  const batchRequestIdRef = useRef(0);
  const pendingBatchRequestsRef = useRef<Map<number, PendingBatchRequest>>(new Map());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(INPUT_KEY, input);
      } catch {
        /* ignore quota and private-mode failures */
      }
    }, INPUT_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* ignore quota and private-mode failures */
    }
  }, [mode]);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/compression.worker.ts', import.meta.url), { type: 'module' });
    const pendingRequests = pendingBatchRequestsRef.current;
    batchWorkerRef.current = worker;

    worker.onmessage = (event: MessageEvent<CompressionWorkerResponse>) => {
      const pending = pendingRequests.get(event.data.requestId);
      if (!pending) {
        return;
      }
      pendingRequests.delete(event.data.requestId);
      pending.resolve(event.data.result);
    };

    worker.onerror = () => {
      const error = new Error('Batch compression worker failed.');
      for (const pending of pendingRequests.values()) {
        pending.reject(error);
      }
      pendingRequests.clear();
    };

    return () => {
      worker.terminate();
      batchWorkerRef.current = null;
      pendingRequests.clear();
    };
  }, []);

  useEffect(() => {
    updateBrowserUrl({
      mode,
      profile,
      maxRisk,
      input,
      tokenizer,
      targetTokens: targetTokens ? String(targetTokens) : undefined,
      allowUnsafeTransforms,
      customTransforms: mode === 'custom' ? customTransforms : undefined,
    });
  }, [mode, profile, maxRisk, input, tokenizer, targetTokens, allowUnsafeTransforms, customTransforms]);

  const isLargeFile = input.length >= 1_000_000;
  const largeFileAcknowledged = ackedLength >= input.length;
  const recommendation = useMemo(() => {
    const next = getRecommendationForText(input);
    if (!next) return null;
    return next.profile === profile && next.mode === mode ? null : next;
  }, [input, profile, mode]);

  useEffect(() => {
    if (isLargeFile && !largeFileAcknowledged) return;
    run(input, {
      mode, tokenizer, profile,
      targetTokens: targetTokens ? Number(targetTokens) : undefined,
      maxRisk, allowUnsafeTransforms,
      ...(mode === 'custom' ? { enabledTransforms: customTransforms } : {}),
    });
  }, [input, mode, customTransforms, run, profile, tokenizer, targetTokens, maxRisk, allowUnsafeTransforms, isLargeFile, largeFileAcknowledged]);

  function applyRecommendation(next: CompressionRecommendation) {
    setProfile(next.profile);
    setMode(next.mode);
  }

  async function compressBatchText(text: string, options: CompressionOptions): Promise<CompressionResult> {
    return new Promise<CompressionResult>((resolve, reject) => {
      const worker = batchWorkerRef.current;
      if (!worker) {
        reject(new Error('Batch compression worker unavailable.'));
        return;
      }

      const requestId = batchRequestIdRef.current + 1;
      batchRequestIdRef.current = requestId;
      pendingBatchRequestsRef.current.set(requestId, { resolve, reject });

      const request: CompressionWorkerRequest = {
        requestId,
        text,
        options,
      };
      worker.postMessage(request);
    });
  }

  function handleInputChange(value: string) {
    setInput(value);
    setBatchRows([]);
    setAckedLength(0);
  }

  function applyFileRecommendation(filename: string) {
    const next = getRecommendationForFilename(filename);
    if (next) {
      applyRecommendation(next);
    }
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked = Array.from(files).filter((file) =>
      SUPPORTED.has(file.name.split('.').pop()?.toLowerCase() ?? ''),
    );
    if (picked.length === 1) {
      try {
        applyFileRecommendation(picked[0].name);
        handleInputChange(await picked[0].text());
        setBatchRows([]);
      } catch {
        /* ignore unreadable file */
      }
      return;
    }
    const rows: BatchRow[] = [];
    setBatchRows([]);
    for (const file of picked) {
      try {
        const text = await file.text();
        const out = await compressBatchText(text, {
          mode, tokenizer, profile,
          targetTokens: targetTokens ? Number(targetTokens) : undefined,
          maxRisk, allowUnsafeTransforms,
          ...(mode === 'custom' ? { enabledTransforms: customTransforms } : {}),
        });
        const row: BatchRow = {
          filename: file.name,
          result: out,
          ratio: out.metrics.originalChars > 0
            ? (out.metrics.outputChars / out.metrics.originalChars).toFixed(3)
            : '1.000',
          status: out.error ? 'failed' : 'ok',
        };
        rows.push(row);
        setBatchRows([...rows]);
      } catch {
        const row: BatchRow = {
          filename: file.name,
          result: {
            output: '', mode, profile,
            metrics: {
              originalChars: 0, outputChars: 0, charSavings: 0,
              originalWords: 0, outputWords: 0,
              estimatedTokensBefore: 0, estimatedTokensAfter: 0,
              estimatedTokenSavings: 0, tokenizerUsed: tokenizer, tokenizerExact: false,
            },
            report: { transformStats: [], removedPhrases: [], replacedPhrases: [], abbreviationHits: 0, operatorHits: 0, protectedSpanStats: {} as ProtectedSpanStats, riskEvents: [], diffPreview: [] },
            warnings: ['Failed to read file'],
            safetyIssues: [], rejectedTransforms: [],
          } as CompressionResult,
          ratio: '1.000',
          status: 'failed',
        };
        rows.push(row);
        setBatchRows([...rows]);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  async function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    await onFilesSelected(event.dataTransfer.files);
  }

  function handleReset() {
    try {
      localStorage.removeItem(INPUT_KEY);
      localStorage.removeItem(MODE_KEY);
    } catch {
      /* ignore */
    }
    setInput('');
    setMode('normal');
    setProfile('general');
    setMaxRisk('medium');
    setBatchRows([]);
    setBatchExportFormat('txt');
    setAckedLength(0);
    setHistoryOpen(false);
    resetCustomTransforms();
    onResetAppSettings();
    updateBrowserUrl({});
  }

  function handleSaveToHistory() {
    if (!result) return;
    addEntry(input, result, mode, profile, maxRisk);
  }

  function handleRestoreHistory(entry: import('../hooks/useCompressionHistory').HistoryEntry) {
    setInput(entry.input);
    setMode(entry.mode);
    setProfile(entry.profile);
    setMaxRisk(entry.maxRisk);
    setBatchRows([]);
    setAckedLength(0);
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
      <MetricsBar
        result={result}
        processing={processing}
        onSaveToHistory={handleSaveToHistory}
        onToggleHistory={() => setHistoryOpen((v) => !v)}
        historyOpen={historyOpen}
      />

      <div
        className="flex flex-1 flex-col xl:flex-row overflow-auto xl:overflow-hidden relative"
        onDrop={(e) => void onDrop(e)}
        onDragOver={(e) => e.preventDefault()}
      >
        <LargeFileWarning
          charCount={input.length}
          onCompressAnyway={() => setAckedLength(input.length)}
          onCancel={() => handleInputChange('')}
        />
        <ControlsPanel
          mode={mode}
          setMode={setMode}
          profile={profile}
          setProfile={setProfile}
          maxRisk={maxRisk}
          setMaxRisk={setMaxRisk}
          allowUnsafeTransforms={allowUnsafeTransforms}
          setAllowUnsafeTransforms={setAllowUnsafeTransforms}
          customTransforms={customTransforms}
          toggleCustomTransform={toggleCustomTransform}
          resetCustomTransforms={resetCustomTransforms}
          onLoadSample={handleInputChange}
          onUploadFiles={(files) => void onFilesSelected(files)}
          onReset={handleReset}
          targetTokens={targetTokens ? Number(targetTokens) : undefined}
          currentTokens={result?.metrics.estimatedTokensAfter}
          recommendation={recommendation}
          onApplyRecommendation={() => recommendation && applyRecommendation(recommendation)}
          fileAccept={FILE_ACCEPT}
        />

        <InputPanel value={input} onChange={handleInputChange} />

        <ResultTabs
          result={result}
          input={input}
          onDownloadOutput={handleDownloadOutput}
          onDownloadReport={handleDownloadReport}
        />

        {historyOpen && (
          <HistoryPanel
            history={history}
            onRestore={handleRestoreHistory}
            onRemove={removeEntry}
            onClear={clearHistory}
            onClose={() => setHistoryOpen(false)}
          />
        )}
      </div>

      {batchRows.length > 0 && (
        <div className="shrink-0 overflow-auto border-t border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Batch — {batchRows.length} file{batchRows.length !== 1 ? 's' : ''}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {mode}
            </span>
            <div className="ml-auto flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span>Export as:</span>
              <select
                value={batchExportFormat}
                onChange={(e) => setBatchExportFormat(e.target.value as ExportFormat)}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
              >
                <option value="txt">.txt</option>
                <option value="md">.md</option>
                <option value="json">.json</option>
              </select>
              <button className="rounded bg-slate-900 px-2 py-1 text-white transition-colors hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600" onClick={exportBatchAll}>
                Download all
              </button>
              <button className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={exportBatchSummary}>
                Summary JSON
              </button>
            </div>
          </div>
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800 dark:text-slate-500">
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
                <tr key={r.filename} className="border-t border-slate-200/80 hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/20">
                  <td className="py-1 font-mono text-slate-700 dark:text-slate-300">{r.filename}</td>
                  <td className="py-1 pr-3 text-right text-slate-500 dark:text-slate-400">{r.result.metrics.originalChars.toLocaleString()}</td>
                  <td className="py-1 pr-3 text-right text-slate-500 dark:text-slate-400">{r.result.metrics.outputChars.toLocaleString()}</td>
                  <td className="py-1 pr-3 text-right text-slate-500 dark:text-slate-400">{r.result.metrics.estimatedTokensBefore.toLocaleString()}</td>
                  <td className="py-1 pr-3 text-right text-slate-500 dark:text-slate-400">{r.result.metrics.estimatedTokensAfter.toLocaleString()}</td>
                  <td className="py-1 pr-3 text-right text-slate-500 dark:text-slate-400">{r.ratio}</td>
                  <td className="py-1 text-right pr-3">
                    <span className={r.status === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.status}</span>
                  </td>
                  <td className="py-1 text-right">
                    <button
                      className="mr-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => {
                        const payload = outputForFormat({ output: r.result.output, filename: r.filename, mode: r.result.mode }, batchExportFormat);
                        download(payload.filename, payload.content);
                      }}
                    >
                      Output
                    </button>
                    <button
                      className="rounded border border-slate-200 bg-white px-2 py-0.5 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
