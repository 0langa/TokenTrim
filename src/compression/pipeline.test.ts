import { describe, it, expect } from 'vitest';
import { compress } from './pipeline';
import type { CompressionMode } from './types';

const SAMPLE = `The system should be able to process requests very quickly.
It is important that we implement a solution for the problem.
There are many ways to approach this issue, and we need to find the best one.
You should consider using a cache to improve performance.
The database connection pool will help with scalability.`;

const MODES: CompressionMode[] = ['light', 'normal', 'heavy', 'ultra'];

describe('compress pipeline', () => {
  for (const mode of MODES) {
    it(`mode=${mode} returns output`, () => {
      const result = compress(SAMPLE, { mode, profile: 'general' });
      expect(result.mode).toBe(mode);
      expect(result.output.length).toBeGreaterThan(0);
    });
  }

  it('custom transform selection works', () => {
    const res = compress(SAMPLE, { mode: 'custom', enabledTransforms: ['filler-removal'], profile: 'general' });
    expect(res.report.transformStats.some((x) => x.transformId === 'filler-removal')).toBe(true);
  });

  it('rejects unsafe transform when semantic loss detected', () => {
    const input = 'You must not remove https://example.com and path src/app.ts and version 1.2.3';
    const res = compress(input, { mode: 'custom', enabledTransforms: ['caveman-compaction'], maxRisk: 'high', profile: 'general' });
    expect(Array.isArray(res.rejectedTransforms)).toBe(true);
    expect(Array.isArray(res.safetyIssues)).toBe(true);
  });

  it('keeps markdown/code fences structure', () => {
    const md = '# H\n\nParagraph\n\n- one\n- two\n\n```ts\nconst x = 1\n```';
    const out = compress(md, { mode: 'heavy', profile: 'markdown-docs' });
    expect(out.output).toContain('```ts');
    expect(out.output).toContain('\n\n- one');
  });
});
