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

  it('removes near-duplicate sentences via trigram Jaccard', () => {
    const s1 = 'The quick brown fox jumps over the lazy dog and runs into the forest.';
    const s2 = 'The quick brown fox jumps over the lazy dog and runs into the woods.';
    const input = `${s1}\n\n${s2}`;
    const { output, stat } = deduplicationTransform(input);
    expect(stat.replacements).toBeGreaterThanOrEqual(1);
    expect(output).toContain(s1);
    expect(output).not.toContain(s2);
  });

  it('keeps unique sentences even when paragraphs differ', () => {
    const input = 'This is a completely unique sentence with many words here.\n\nAnother entirely different sentence with many words there.';
    const { output, stat } = deduplicationTransform(input);
    expect(output).toContain('This is a completely unique sentence with many words here.');
    expect(output).toContain('Another entirely different sentence with many words there.');
    expect(stat.replacements).toBe(0);
  });

  it('skips short sentences for near-duplicate check', () => {
    const input = 'Short one.\n\nShort one.';
    const { output, stat } = deduplicationTransform(input);
    expect(output).toContain('Short one.');
    expect(stat.replacements).toBe(0);
  });
});
