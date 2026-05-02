import type { RiskLevel, TransformStat, TransformExample } from '../types';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MARKER = '[duplicate removed]';

export function deduplicationTransform(input: string): {
  output: string;
  stat: TransformStat;
  examples: TransformExample[];
} {
  const risk: RiskLevel = 'medium';
  const paragraphs = input.split(/\n{2,}/);
  const seen = new Set<number>();
  let replacements = 0;
  let charsSaved = 0;
  const examples: TransformExample[] = [];

  const result = paragraphs.map((para) => {
    const key = hashStr(para.trim().toLowerCase());
    if (seen.has(key) && para.trim().length > 20) {
      replacements += 1;
      charsSaved += para.length - MARKER.length;
      if (examples.length < 5) examples.push({ before: para.slice(0, 80), after: MARKER });
      return MARKER;
    }
    seen.add(key);
    return para;
  });

  return {
    output: result.join('\n\n'),
    examples,
    stat: { transformId: 'deduplication', replacements, charsSaved, risk, examples },
  };
}
