import { useEffect, useRef, useState } from 'react';
import type { Intensity } from './compression/types';
import { useCompression } from './hooks/useCompression';
import { MetricsBar } from './components/MetricsBar';
import { IntensitySelector } from './components/IntensitySelector';
import { CopyButton } from './components/CopyButton';

const PLACEHOLDER = `Paste or type large text here…

TokenTrim reduces AI input token usage through lossless, deterministic compression.
Choose an intensity level, then watch the metrics update in real time.`;

export default function App() {
  const [input, setInput] = useState('');
  const [intensity, setIntensity] = useState<Intensity>('light');
  const { result, processing, run } = useCompression();
  const prevIntensity = useRef(intensity);

  useEffect(() => {
    run(input, intensity);
    prevIntensity.current = intensity;
  }, [input, intensity, run]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight text-violet-400">TokenTrim</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">lossless · local · zero-AI</span>
        </div>
        <a
          href="https://github.com/0langa/TokenTrim"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          GitHub ↗
        </a>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Intensity</span>
          <IntensitySelector value={intensity} onChange={setIntensity} />
        </div>
        <div className="ml-auto">
          <CopyButton result={result} />
        </div>
      </div>

      {/* Dual pane */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Input pane */}
        <div className="flex flex-col flex-1 border-r border-slate-700 min-w-0">
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Input</span>
            <div className="flex items-center gap-3">
              {input.length > 0 && (
                <span className="text-xs text-slate-500 font-mono">
                  {input.length.toLocaleString()} chars
                </span>
              )}
              {input.length > 0 && (
                <button
                  onClick={() => setInput('')}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            className="flex-1 resize-none bg-slate-900 text-slate-200 text-sm font-mono p-4 outline-none placeholder:text-slate-600 leading-relaxed"
          />
        </div>

        {/* Output pane */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Output</span>
            {result?.passed && (
              <span className="text-xs text-slate-500 font-mono">
                {result.outputChars.toLocaleString()} chars
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto relative">
            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 z-10">
                <span className="text-sm text-violet-400 animate-pulse">Processing…</span>
              </div>
            )}
            <pre className="p-4 text-sm font-mono text-slate-200 whitespace-pre-wrap break-all leading-relaxed min-h-full">
              {result?.passed
                ? result.output
                : result?.error
                  ? <span className="text-red-400">{result.error}</span>
                  : !input
                    ? <span className="text-slate-600">Output will appear here…</span>
                    : null
              }
            </pre>

            {/* Legend panel */}
            {result?.passed && result.legend && Object.keys(result.legend).length > 0 && (
              <details className="border-t border-slate-700 px-4 py-2">
                <summary className="text-xs text-slate-400 cursor-pointer select-none py-1 hover:text-slate-200">
                  Token map ({Object.keys(result.legend).length} entries)
                </summary>
                <table className="mt-2 text-xs font-mono w-full">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left pb-1 w-16">Token</th>
                      <th className="text-left pb-1">Phrase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.legend).map(([token, phrase]) => (
                      <tr key={token} className="border-t border-slate-800">
                        <td className="py-0.5 text-violet-400 pr-4">{token}</td>
                        <td className="py-0.5 text-slate-300 truncate max-w-xs">{phrase}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* Metrics bar */}
      <MetricsBar result={result} processing={processing} />
    </div>
  );
}
