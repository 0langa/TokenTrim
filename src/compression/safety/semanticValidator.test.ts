import { describe, it, expect } from 'vitest';
import { validateSemanticSafety } from './semanticValidator';

describe('semantic validator', () => {
  it('detects negation/number/url/path losses', () => {
    const before = 'must not remove 12 from 2026-05-02 v1.2.3 https://a.com src/app.ts';
    const after = 'remove';
    const issues = validateSemanticSafety(before, after, [], []);
    expect(issues.some((x) => x.category === 'negation-loss')).toBe(true);
    expect(issues.some((x) => x.category === 'number-loss')).toBe(true);
    expect(issues.some((x) => x.category === 'url-loss')).toBe(true);
    expect(issues.some((x) => x.category === 'path-loss')).toBe(true);
  });
});
