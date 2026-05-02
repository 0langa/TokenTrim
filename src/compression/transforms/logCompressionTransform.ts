import type { TransformExample, TransformStat } from '../types';

const TS_RE = /\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g;

export function logCompressionTransform(input: string): { output: string; stat: TransformStat; examples: TransformExample[] } {
  const lines = input.split('\n');
  const examples: TransformExample[] = [];
  const out: string[] = [];
  let replacements = 0;
  let charsSaved = 0;

  let i = 0;
  while (i < lines.length) {
    const normalized = lines[i].replace(TS_RE, '<ts>');
    let j = i + 1;
    while (j < lines.length && lines[j].replace(TS_RE, '<ts>') === normalized) j += 1;
    const count = j - i;
    if (count > 1) {
      const collapsed = `[repeated ${count}x] ${normalized}`;
      out.push(collapsed);
      replacements += count - 1;
      charsSaved += lines.slice(i, j).join('\n').length - collapsed.length;
      if (examples.length < 8) examples.push({ before: lines[i], after: collapsed });
    } else {
      out.push(lines[i].replace(TS_RE, '<ts>'));
    }
    i = j;
  }

  return {
    output: out.join('\n'),
    examples,
    stat: {
      transformId: 'log-compression',
      replacements,
      charsSaved,
      risk: 'low',
      examples,
    },
  };
}
