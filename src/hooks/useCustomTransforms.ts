import { useState, useCallback } from 'react';
import { getAllTransformIds } from '../compression/transformRegistry';

const KEY = 'tokentrim:custom-transforms';

function readStored(): string[] | null {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return JSON.parse(s) as string[];
  } catch { /* ignore */ }
  return null;
}

export function useCustomTransforms(): [string[], (id: string, on: boolean) => void] {
  const [enabled, setEnabled] = useState<string[]>(() => readStored() ?? getAllTransformIds());

  const toggle = useCallback((id: string, on: boolean) => {
    setEnabled((prev) => {
      const next = on ? [...prev, id] : prev.filter((x) => x !== id);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  return [enabled, toggle];
}
