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

  it('enabledTransforms override profile defaults', () => {
    const res = compress('Thanks\n\n2026-05-02T10:00:00Z ERROR TimeoutError\n2026-05-02T10:00:00Z ERROR TimeoutError', {
      mode: 'light',
      profile: 'logs',
      enabledTransforms: ['filler-removal'],
    });
    expect(res.report.transformStats.some((x) => x.transformId === 'filler-removal')).toBe(true);
    expect(res.report.transformStats.some((x) => x.transformId === 'log-compression')).toBe(false);
  });

  it('rejects unsafe transform when semantic loss detected', () => {
    const input = 'You should not deploy this.';
    const res = compress(input, { mode: 'ultra', enabledTransforms: ['caveman-compaction'], maxRisk: 'high', profile: 'general' });
    expect(res.rejectedTransforms).toContain('caveman-compaction');
    expect(res.safetyIssues.some((x) => x.severity === 'error')).toBe(true);
    expect(res.output).toContain('should not');
  });

  it('keeps markdown/code fences structure', () => {
    const md = '# H\n\nParagraph\n\n- one\n- two\n\n```ts\nconst x = 1\n```';
    const out = compress(md, { mode: 'heavy', profile: 'markdown-docs' });
    expect(out.output).toContain('```ts');
    expect(out.output).toContain('\n\n- one');
  });

  it('general profile respects mode aggressiveness', () => {
    const input = 'The implementation and documentation should be concise and clear.';
    const light = compress(input, { mode: 'light', profile: 'general' });
    const heavy = compress(input, { mode: 'heavy', profile: 'general' });
    expect(light.report.transformStats.some((x) => x.transformId === 'article-removal')).toBe(false);
    expect(light.report.transformStats.some((x) => x.transformId === 'operator')).toBe(false);
    expect(heavy.metrics.charSavings).toBeGreaterThanOrEqual(light.metrics.charSavings);
  });

  it('profile-specific transforms still run', () => {
    const logInput = 'ERROR TimeoutError at service boundary\nERROR TimeoutError at service boundary';
    const logRes = compress(logInput, { mode: 'light', profile: 'logs' });
    expect(logRes.report.transformStats.some((x) => x.transformId === 'log-compression')).toBe(true);

    const ctxInput = 'Thanks\n\n## Requirements\nThe system must not fail.\n\nOkay';
    const ctxRes = compress(ctxInput, { mode: 'light', profile: 'agent-context' });
    expect(ctxRes.report.transformStats.some((x) => x.transformId === 'markdown-cleanup' || x.transformId === 'section-salience')).toBe(true);
  });
});
