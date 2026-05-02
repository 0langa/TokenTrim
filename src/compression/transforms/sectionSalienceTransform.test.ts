import { describe, it, expect } from 'vitest';
import { sectionSalienceTransform } from './sectionSalienceTransform';

describe('section salience', () => {
  it('preserves fenced code blocks', () => {
    const input = 'thanks\n\n```ts\nconst x = 1\n```\n\nokay';
    const out = sectionSalienceTransform(input, true);
    expect(out.output).toContain('const x = 1');
  });
});
