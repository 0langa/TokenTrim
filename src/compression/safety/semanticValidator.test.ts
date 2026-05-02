import { describe, it, expect } from 'vitest';
import { validateSemanticSafety } from './semanticValidator';

describe('semantic validator', () => {
  it('detects negation and requirement marker loss', () => {
    const before = 'You must not remove this and should not ignore that because we cannot fail.';
    const after = 'You remove this and ignore that because we can fail.';
    const issues = validateSemanticSafety(before, after, [], []);
    expect(issues.some((x) => x.category === 'negation-loss')).toBe(true);
    expect(issues.some((x) => x.category === 'requirement-loss')).toBe(true);
  });

  it('detects number/date/semver/url/path losses', () => {
    const before = 'Keep 42, date 2026-05-02, version v1.3.0, https://example.com/docs and src/app.ts';
    const after = 'Keep items.';
    const issues = validateSemanticSafety(before, after, [], []);
    expect(issues.some((x) => x.category === 'number-loss')).toBe(true);
    expect(issues.some((x) => x.category === 'date-loss')).toBe(true);
    expect(issues.some((x) => x.category === 'semver-loss')).toBe(true);
    expect(issues.some((x) => x.category === 'url-loss')).toBe(true);
    expect(issues.some((x) => x.category === 'path-loss')).toBe(true);
  });
});
