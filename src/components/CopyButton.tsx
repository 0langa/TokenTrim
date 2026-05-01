import { useState } from 'react';
import type { CompressionResult } from '../compression/types';

interface Props {
  result: CompressionResult | null;
  requireUltraConfirm: boolean;
}

export function CopyButton({ result, requireUltraConfirm }: Props) {
  const [copied, setCopied] = useState(false);

  const ensureConfirmed = () => {
    if (!requireUltraConfirm) return true;
    return window.confirm('Ultra mode uses maximum compression and may reduce readability. Copy anyway?');
  };

  const handleCopy = async () => {
    if (!result || !ensureConfirmed()) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!result}
      className="px-3 py-1.5 rounded text-sm bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {copied ? 'Copied' : 'Copy output'}
    </button>
  );
}
