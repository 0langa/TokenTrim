import { describe, it, expect } from 'vitest';
import { computeWordDiff } from './wordDiff';

describe('computeWordDiff', () => {
  it('identical strings produce only equal chunks', () => {
    const chunks = computeWordDiff('hello world', 'hello world');
    expect(chunks.every((c) => c.op === 'equal')).toBe(true);
    expect(chunks.map((c) => c.text).join('')).toBe('hello world');
  });

  it('complete deletion produces delete chunk', () => {
    const chunks = computeWordDiff('hello world', '');
    expect(chunks.some((c) => c.op === 'delete')).toBe(true);
    expect(chunks.filter((c) => c.op === 'insert').length).toBe(0);
  });

  it('complete insertion produces insert chunk', () => {
    const chunks = computeWordDiff('', 'hello world');
    expect(chunks.some((c) => c.op === 'insert')).toBe(true);
    expect(chunks.filter((c) => c.op === 'delete').length).toBe(0);
  });

  it('word replacement produces delete + insert pair', () => {
    const chunks = computeWordDiff('very important feature', 'important feature');
    const ops = chunks.map((c) => c.op);
    expect(ops).toContain('delete');
  });

  it('joined equal chunks reconstruct original text', () => {
    const original = 'The quick brown fox jumps over the lazy dog.';
    const compressed = 'quick brown fox jumps lazy dog.';
    const chunks = computeWordDiff(original, compressed);
    const reconstructed = chunks.filter((c) => c.op !== 'delete').map((c) => c.text).join('');
    expect(reconstructed).toBe(compressed);
  });

  it('handles empty inputs without throwing', () => {
    expect(() => computeWordDiff('', '')).not.toThrow();
    expect(() => computeWordDiff('text', '')).not.toThrow();
    expect(() => computeWordDiff('', 'text')).not.toThrow();
  });

  it('preserves newlines in equal chunks', () => {
    const text = 'line one\nline two\nline three';
    const chunks = computeWordDiff(text, text);
    const joined = chunks.map((c) => c.text).join('');
    expect(joined).toBe(text);
  });
});
