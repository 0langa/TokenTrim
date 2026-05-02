import { describe, it, expect } from 'vitest';
import { deduplicationTransform } from './deduplicationTransform';

describe('deduplicationTransform', () => {
  it('removes duplicate paragraphs', () => {
    const para = 'This is a repeated paragraph that is quite long enough to be caught.';
    const input = `${para}\n\nSomething different.\n\n${para}`;
    const { output } = deduplicationTransform(input);
    expect(output).toContain('[duplicate removed]');
    expect(output.split(para).length - 1).toBe(1); // only one occurrence
  });

  it('keeps unique paragraphs intact', () => {
    const input = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
    const { output } = deduplicationTransform(input);
    expect(output).toContain('Paragraph one.');
    expect(output).toContain('Paragraph two.');
    expect(output).toContain('Paragraph three.');
  });

  it('stat reports replacements', () => {
    const para = 'Repeated paragraph content that is long enough to trigger dedup.';
    const input = `${para}\n\n${para}\n\n${para}`;
    const { stat } = deduplicationTransform(input);
    expect(stat.replacements).toBeGreaterThan(0);
  });

  it('does not remove short duplicates (< 20 chars)', () => {
    const input = 'OK\n\nOK\n\nOK';
    const { output } = deduplicationTransform(input);
    expect(output).not.toContain('[duplicate removed]');
  });

  it('handles single paragraph without error', () => {
    const input = 'Just one paragraph here.';
    const { output } = deduplicationTransform(input);
    expect(output).toBe(input);
  });

  it('empty string returns empty string', () => {
    const { output } = deduplicationTransform('');
    expect(output).toBe('');
  });
});
