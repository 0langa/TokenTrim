import { describe, expect, it } from 'vitest';
import { compress } from '../src/compression/pipeline';

describe('mode mapping and one-way contract', () => {
  it('supports exactly five modes including custom', async () => {
    const { listModes } = await import('../src/compression/pipeline');
    expect(listModes().map((m) => m.id)).toEqual(['light', 'normal', 'heavy', 'ultra', 'custom']);
  });

  it('is deterministic for same input+mode', () => {
    const input = 'Please note that in order to improve the implementation we should update the documentation.';
    const a = compress(input, { mode: 'heavy' });
    const b = compress(input, { mode: 'heavy' });
    expect(a.output).toBe(b.output);
  });

  it('legacy profile compatibility maps to modes', () => {
    const input = 'Please note we need implementation and documentation updates.';
    const legacy = compress(input, { profileId: 'lossy-agent' });
    const direct = compress(input, { mode: 'ultra' });
    expect(legacy.mode).toBe('ultra');
    expect(legacy.output).toBe(direct.output);
  });

  it('light preserves sensitive semantics better than heavy', () => {
    const input = 'The requirement must not exceed 10ms and should not change.';
    const light = compress(input, { mode: 'light' });
    const heavy = compress(input, { mode: 'heavy' });
    expect(light.output).toContain('requirement');
    expect(light.output).toContain('must not');
    expect(heavy.metrics.estimatedTokenSavings).toBeGreaterThanOrEqual(light.metrics.estimatedTokenSavings);
  });

  it('heavy/ultra achieve stronger savings than light/normal on verbose prompts', () => {
    const corpus = [
      'Please note that it is important to mention that in order to improve the implementation we should provide documentation and a response format that can be easily parsed by the downstream agent.',
      'In general, I believe we should be able to reduce unnecessary verbosity because the system is currently using a large number of tokens for explanations that are not critical.',
      'Can you please provide a concise analysis and also include the exact steps that should be taken with regard to configuration, authentication, and repository setup?',
      'It should be noted that the request processing pipeline is able to significantly improve throughput when we remove repeated discourse markers and compress recurring phrases.',
      'Generally speaking, for what it is worth, I think the team should prioritize implementation details that lead to measurable reductions in token usage.',
    ];

    const savings = (mode: 'light' | 'normal' | 'heavy' | 'ultra') => {
      const values = corpus.map((text) => compress(text, { mode }).metrics.estimatedTokenSavings / Math.max(1, compress(text, { mode }).metrics.estimatedTokensBefore));
      values.sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)];
    };

    const light = savings('light');
    const normal = savings('normal');
    const heavy = savings('heavy');
    const ultra = savings('ultra');

    expect(normal).toBeGreaterThan(light);
    expect(heavy).toBeGreaterThan(normal);
    expect(ultra).toBeGreaterThanOrEqual(heavy);
    expect(ultra).toBeGreaterThanOrEqual(0.35);
  });
});
