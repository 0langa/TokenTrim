import { describe, it, expect } from 'vitest';
import { compress } from './pipeline';
import { createCompressionReport } from './reporting';
import { TOKENTRIM_VERSION } from '../version';

describe('reporting', () => {
  it('serializes report json', () => {
    const result = compress('please note we should reduce text', { mode: 'normal', profile: 'general' });
    const report = createCompressionReport(result);
    const str = JSON.stringify(report);
    expect(str.length).toBeGreaterThan(10);
    expect(report.mode).toBe('normal');
    expect(Array.isArray(report.transforms)).toBe(true);
    expect(report.version).toBe(TOKENTRIM_VERSION);
  });

  it('includes tokenizer exactness in report', () => {
    const result = compress('some text to compress', { mode: 'normal', profile: 'general', tokenizer: 'openai-cl100k' });
    const report = createCompressionReport(result);
    expect(report.tokenizerExact).toBe(false);
    expect(report.tokenizer).toBe('openai-cl100k');
  });

  it('report includes safety issues and rejected transforms arrays', () => {
    const result = compress('reduce this text please', { mode: 'normal', profile: 'general' });
    const report = createCompressionReport(result);
    expect(Array.isArray(report.safetyIssues)).toBe(true);
    expect(Array.isArray(report.rejectedTransforms)).toBe(true);
    expect(Array.isArray(report.warnings)).toBe(true);
  });

  it('report JSON is fully serializable', () => {
    const result = compress('You must not remove this important section.', { mode: 'heavy', profile: 'general', maxRisk: 'high' });
    const report = createCompressionReport(result);
    expect(() => JSON.stringify(report)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(report));
    expect(parsed.version).toBe(TOKENTRIM_VERSION);
    expect(parsed.input.chars).toBeGreaterThan(0);
    expect(parsed.output.chars).toBeGreaterThan(0);
  });

  it('report budget fields reflect compression options', () => {
    const result = compress('This is a test document with some content.', { mode: 'normal', profile: 'general', targetTokens: 100 });
    const report = createCompressionReport(result);
    expect(report.targetTokens).toBe(100);
    expect(typeof report.budgetReached).toBe('boolean');
  });

  it('report includes durationMs timing', () => {
    const result = compress('please note we should reduce text', { mode: 'normal', profile: 'general' });
    const report = createCompressionReport(result);
    expect(typeof report.durationMs).toBe('number');
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });
});
