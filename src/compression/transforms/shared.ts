import type { RiskLevel, TransformExample, TransformStat } from '../types';

export type Rule = { pattern: RegExp; replacement: string };

function interpolateReplacement(replacement: string, groups: string[]): string {
  return replacement.replace(/\$(\d+)/g, (_, n) => groups[Number(n) - 1] ?? '');
}

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
    output = output.replace(rule.pattern, (match, ...args) => {
      if (shouldReplace && !shouldReplace(match)) {
        return match;
      }
      // args contains capture groups followed by offset and input string
      const groups = args.slice(0, -2);
      const after = interpolateReplacement(rule.replacement, groups);
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
