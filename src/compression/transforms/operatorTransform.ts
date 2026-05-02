import type { Rule } from './shared';

// Code-like line: contains camelCase, underscores, brackets, or backticks
const CODE_LINE_RE = /[_`\[\]{}<>()]|[a-z][A-Z]|[A-Z]{2,}[a-z]/;

function isCodeLine(line: string): boolean {
  return CODE_LINE_RE.test(line);
}

// Apply operator rules only to non-code lines
function applyProseOnly(input: string, rules: Rule[]): { output: string; replacements: number; charsSaved: number; examples: Array<{ before: string; after: string }> } {
  const lines = input.split('\n');
  let replacements = 0;
  let charsSaved = 0;
  const examples: Array<{ before: string; after: string }> = [];

  const result = lines.map((line) => {
    if (isCodeLine(line)) return line;
    let out = line;
    for (const rule of rules) {
      out = out.replace(rule.pattern, (match) => {
        const after = rule.replacement;
        replacements += 1;
        charsSaved += Math.max(0, match.length - after.length);
        if (examples.length < 10) examples.push({ before: match, after });
        return after;
      });
    }
    return out;
  });

  return { output: result.join('\n'), replacements, charsSaved, examples };
}

const BASE: Rule[] = [
  { pattern: /\b(causes|results in|leads to)\b/gi, replacement: '->' },
  { pattern: /\band\b/g, replacement: '&' },
  { pattern: /\bwith\b/g, replacement: 'w/' },
  { pattern: /\bwithout\b/g, replacement: 'w/o' },
  { pattern: /\bgreater than\b/gi, replacement: '>' },
  { pattern: /\bless than\b/gi, replacement: '<' },
  { pattern: /\bequals\b/gi, replacement: '=' },
];

export function operatorTransform(input: string, becauseMode: 'bc' | 'left-arrow' = 'bc') {
  const becauseRule: Rule = becauseMode === 'left-arrow'
    ? { pattern: /\bbecause\b/gi, replacement: '<-' }
    : { pattern: /\bbecause\b/gi, replacement: 'bc' };
  const rules = [becauseRule, ...BASE];
  const { output, replacements, charsSaved, examples } = applyProseOnly(input, rules);
  return {
    output,
    examples,
    stat: {
      transformId: 'operator',
      replacements,
      charsSaved,
      risk: 'high' as const,
      examples,
    },
  };
}
