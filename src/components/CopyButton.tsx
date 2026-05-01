import { useState } from 'react';
import type { CompressionResult } from '../compression/types';

interface Props {
  result: CompressionResult | null;
}

export function CopyButton({ result }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedPlain, setCopiedPlain] = useState(false);

  const handleCopyWithLegend = async () => {
    if (!result) return;
    const prefix = result.legend
      ? `=== TOKEN LEGEND JSON ===\n${JSON.stringify(result.legend, null, 2)}\n=== END TOKEN LEGEND JSON ===\n\n`
      : '';
    await navigator.clipboard.writeText(prefix + result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPlain = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.output);
    setCopiedPlain(true);
    setTimeout(() => setCopiedPlain(false), 2000);
  };

  const disabled = !result;

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopyPlain}
        disabled={disabled}
        className="px-3 py-1.5 rounded text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {copiedPlain ? 'Copied' : 'Copy output'}
      </button>
      <button
        onClick={handleCopyWithLegend}
        disabled={disabled}
        className="px-3 py-1.5 rounded text-sm bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {copied ? 'Copied' : 'Copy + legend'}
      </button>
    </div>
  );
}
