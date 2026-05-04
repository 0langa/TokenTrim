import { useState, useCallback } from 'react';
import type { CompressionMode, CompressionProfile, RiskLevel, CompressionResult } from '../compression/types';

const HISTORY_KEY = 'tokentrim:history';
const MAX_ENTRIES = 50;
const MIN_RETAINED_ENTRIES = 5;

export type HistoryEntry = {
  id: string;
  timestamp: number;
  mode: CompressionMode;
  profile: CompressionProfile;
  maxRisk: RiskLevel;
  metrics: {
    originalChars: number;
    outputChars: number;
    estimatedTokensBefore: number;
    estimatedTokensAfter: number;
    estimatedTokenSavings: number;
  };
  inputPreview: string;
  outputPreview: string;
  safetyIssueCount: number;
  warningCount: number;
  rejectedCount: number;
  input: string;
  output: string;
};

function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw) as HistoryEntry[];
  } catch { /* ignore */ }
  return [];
}

function writeHistory(entries: HistoryEntry[]) {
  let next = entries;
  while (next.length >= MIN_RETAINED_ENTRIES) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return;
    } catch {
      next = next.slice(0, -1);
    }
  }

  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

export function useCompressionHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(readHistory);
  const [open, setOpen] = useState(false);

  const addEntry = useCallback((
    input: string,
    result: CompressionResult,
    mode: CompressionMode,
    profile: CompressionProfile,
    maxRisk: RiskLevel,
  ) => {
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      mode,
      profile,
      maxRisk,
      metrics: {
        originalChars: result.metrics.originalChars,
        outputChars: result.metrics.outputChars,
        estimatedTokensBefore: result.metrics.estimatedTokensBefore,
        estimatedTokensAfter: result.metrics.estimatedTokensAfter,
        estimatedTokenSavings: result.metrics.estimatedTokenSavings,
      },
      inputPreview: input.slice(0, 80).replace(/\n/g, ' ') + (input.length > 80 ? '…' : ''),
      outputPreview: result.output.slice(0, 80).replace(/\n/g, ' ') + (result.output.length > 80 ? '…' : ''),
      safetyIssueCount: result.safetyIssues.length,
      warningCount: result.warnings.length,
      rejectedCount: result.rejectedTransforms.length,
      input,
      output: result.output,
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      writeHistory(next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      writeHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    writeHistory([]);
  }, []);

  return { history, open, setOpen, addEntry, removeEntry, clearHistory };
}
