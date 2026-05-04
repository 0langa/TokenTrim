import { describe, it, expect } from 'vitest';
import { createUnifiedDiff } from './diff';

describe('createUnifiedDiff', () => {
  it('shows no changes for identical text', () => {
    const diff = createUnifiedDiff('hello\nworld', 'hello\nworld');
    expect(diff).toContain('(no changes)');
  });

  it('shows deletions and insertions', () => {
    const diff = createUnifiedDiff('a\nb\nc', 'a\nx\nc');
    expect(diff).toContain('-b');
    expect(diff).toContain('+x');
  });

  it('shows added lines', () => {
    const diff = createUnifiedDiff('a\nc', 'a\nb\nc');
    expect(diff).toContain('+b');
  });

  it('shows removed lines', () => {
    const diff = createUnifiedDiff('a\nb\nc', 'a\nc');
    expect(diff).toContain('-b');
  });

  it('includes context lines around changes', () => {
    const diff = createUnifiedDiff('1\n2\n3\n4\n5', '1\n2\nX\n4\n5');
    expect(diff).toContain(' 1');
    expect(diff).toContain(' 2');
    expect(diff).toContain('+X');
    expect(diff).toContain(' 4');
    expect(diff).toContain(' 5');
  });
});
