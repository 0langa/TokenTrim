import type { TransformExample, TransformStat } from '../types';

function scoreBlock(block: string): number {
  let score = 0;
  if (/^#{1,6}\s/m.test(block)) score += 4;
  const isList = /^\s*[-*]\s+\S+/m.test(block) || /^\s*\d+\.\s+\S+/m.test(block);
  if (isList) score += 4;
  if (/```/.test(block)) score += 6;
  if (/\b(must|should|shall|required|acceptance criteria|TODO|FIXME)\b/i.test(block)) score += 4;
  if (/\b(error|warning|exception|stack|trace)\b/i.test(block)) score += 3;
  if (/https?:\/\/|\b[A-Za-z]:\\|\/\w+\//.test(block)) score += 2;
  if (/\b(class|function|type|interface)\b/.test(block)) score += 2;
  if (/^\d+\./m.test(block)) score += 2;
  if (/\b(thanks|okay|got it|sounds good)\b/i.test(block)) score -= 3;
  if (block.trim().length < 24 && !isList) score -= 2;
  return score;
}

export function sectionSalienceTransform(input: string, aggressive = false): { output: string; stat: TransformStat; examples: TransformExample[] } {
  const blocks = input.split(/\n\n+/);
  const kept: string[] = [];
  const examples: TransformExample[] = [];
  let replacements = 0;
  let charsSaved = 0;
  const threshold = aggressive ? 2 : 0;

  for (const block of blocks) {
    const score = scoreBlock(block);
    const mustKeep = /```|\u241fTT_SPAN_/.test(block);
    if (!mustKeep && score < threshold) {
      replacements += 1;
      charsSaved += block.length;
      if (examples.length < 8) examples.push({ before: block.slice(0, 80), after: '' });
      continue;
    }
    kept.push(block);
  }

  return {
    output: kept.join('\n\n'),
    examples,
    stat: {
      transformId: 'section-salience',
      replacements,
      charsSaved,
      risk: aggressive ? 'high' : 'medium',
      examples,
    },
  };
}
