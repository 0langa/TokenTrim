import type { RiskLevel, TransformExample, TransformStat } from '../types';

export type Rule = { pattern: RegExp; replacement: string };

export function applyRules(
  input: string,
  transformId: string,
  risk: RiskLevel,
  rules: Rule[],
  shouldReplace?: (match: string) => boolean,
): { output: string; stat: TransformStat; examples: TransformExample[] } {
  let output = input;
  const examples: TransformExample[] = [];
  let replacements = 0;
  let charsSaved = 0;

  for (const rule of rules) {
    output = output.replace(rule.pattern, (match) => {
      if (shouldReplace && !shouldReplace(match)) {
        return match;
      }
      const after = rule.replacement;
      replacements += 1;
      charsSaved += Math.max(0, match.length - after.length);
      if (examples.length < 10) {
        examples.push({ before: match, after });
      }
      return after;
    });
  }

  return {
    output,
    examples,
    stat: {
      transformId,
      replacements,
      charsSaved,
      risk,
      examples,
    },
  };
}
