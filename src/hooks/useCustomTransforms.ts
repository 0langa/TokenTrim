import { useState, useCallback } from 'react';
import { getAllTransformIds } from '../compression/transformRegistry';

const KEY = 'tokentrim:custom-transforms';
const DEFAULT_TRANSFORMS = getAllTransformIds();

function readStored(): string[] | null {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return null;
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return null;
    const allowed = new Set(DEFAULT_TRANSFORMS);
    return parsed.filter((id): id is string => typeof id === 'string' && allowed.has(id));
  } catch { /* ignore */ }
  return null;
}

function persist(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export function useCustomTransforms(): [string[], (id: string, on: boolean) => void, () => void] {
  const [enabled, setEnabled] = useState<string[]>(() => readStored() ?? DEFAULT_TRANSFORMS);

  const toggle = useCallback((id: string, on: boolean) => {
    setEnabled((prev) => {
      const next = on
        ? Array.from(new Set([...prev, id]))
        : prev.filter((x) => x !== id);
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setEnabled(DEFAULT_TRANSFORMS);
    persist(DEFAULT_TRANSFORMS);
  }, []);

  return [enabled, toggle, reset];
}
