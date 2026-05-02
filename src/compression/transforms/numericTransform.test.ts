import { describe, it, expect } from 'vitest';
import { numericTransform } from './numericTransform';

describe('numericTransform', () => {
  it('converts written numbers to digits', () => {
    const { output } = numericTransform('There are fifty items in the list.');
    expect(output).toContain('50');
    expect(output).not.toContain('fifty');
  });

  it('converts percent', () => {
    const { output } = numericTransform('Performance improved by fifty percent.');
    expect(output).toContain('50%');
  });

  it('converts million scale', () => {
    const { output } = numericTransform('Revenue was 5 million last year.');
    expect(output).toContain('5M');
  });

  it('converts thousand scale', () => {
    const { output } = numericTransform('About 3 thousand users signed up.');
    expect(output).toContain('3K');
  });

  it('converts ISO date', () => {
    const { output } = numericTransform('The event is on January 15th, 2025.');
    expect(output).toContain('2025-01-15');
  });

  it('does not modify digits already present', () => {
    const input = 'We have 42 items and 100 users.';
    const { output } = numericTransform(input);
    expect(output).toContain('42');
    expect(output).toContain('100');
  });

  it('stat counts replacements', () => {
    const { stat } = numericTransform('fifty items and twenty users');
    expect(stat.replacements).toBeGreaterThanOrEqual(2);
  });

  it('does not crash on empty string', () => {
    const { output } = numericTransform('');
    expect(output).toBe('');
  });
});
