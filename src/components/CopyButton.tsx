import { useState } from 'react';
import type { CompressionResult } from '../compression/types';

interface Props {
  result: CompressionResult | null;
}

function buildLegendHeader(legend: Record<string, string>): string {
  const lines = ['=== TOKEN MAP (paste this before your content) ==='];
  for (const [token, phrase] of Object.entries(legend)) {
    lines.push(`${token} = ${phrase}`);
  }
  lines.push('=== END TOKEN MAP ===', '');
  return lines.join('\n');
}

export function CopyButton({ result }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedPlain, setCopiedPlain] = useState(false);

  const handleCopyWithLegend = async () => {
    if (!result?.passed) return;
    const prefix = result.legend && Object.keys(result.legend).length > 0
      ? buildLegendHeader(result.legend)
      : '';
    await navigator.clipboard.writeText(prefix + result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPlain = async () => {
    if (!result?.passed) return;
    await navigator.clipboard.writeText(result.output);
    setCopiedPlain(true);
    setTimeout(() => setCopiedPlain(false), 2000);
  };

  const disabled = !result?.passed;

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopyPlain}
        disabled={disabled}
        className="px-3 py-1.5 rounded text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {copiedPlain ? '✓ Copied' : 'Copy'}
      </button>
      <button
        onClick={handleCopyWithLegend}
        disabled={disabled}
        className="px-3 py-1.5 rounded text-sm bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {copied ? '✓ Copied!' : 'Copy with Legend'}
      </button>
    </div>
  );
}
