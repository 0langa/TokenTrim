import type { TransformExample, TransformStat } from '../types';

export function markdownCompressionTransform(input: string): { output: string; stat: TransformStat; examples: TransformExample[] } {
  const lines = input.split('\n');
  const output: string[] = [];
  let inFence = false;
  let replacements = 0;
  let charsSaved = 0;
  const examples: TransformExample[] = [];

  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      output.push(line);
      continue;
    }
    if (inFence) {
      output.push(line);
      continue;
    }

    const original = line;
    let cleaned = line.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/g, '');
    if (/^[-*_]{3,}$/.test(cleaned.trim())) cleaned = '---';

    if (cleaned !== original) {
      replacements += 1;
      charsSaved += Math.max(0, original.length - cleaned.length);
      if (examples.length < 8) examples.push({ before: original, after: cleaned });
    }
    output.push(cleaned);
  }

  const joined = output.join('\n').replace(/\n{3,}/g, '\n\n');
  return {
    output: joined,
    examples,
    stat: {
      transformId: 'markdown-cleanup',
      replacements,
      charsSaved,
      risk: 'safe',
      examples,
    },
  };
}
