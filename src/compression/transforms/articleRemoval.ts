// Remove articles when followed by lowercase or uppercase word.
// Skips lines inside code blocks (detected by backticks or common code patterns).
const CODE_DETECTOR = /`[^`]+`|\b\w+_\w+\b|\b[a-z][a-zA-Z0-9]*[A-Z]/;

function isProseLine(line: string): boolean {
  return !CODE_DETECTOR.test(line);
}

function applyToProseOnly(input: string, rules: { pattern: RegExp; replacement: string }[]) {
  const lines = input.split('\n');
  let replacements = 0;
  let charsSaved = 0;
  const examples: Array<{ before: string; after: string }> = [];

  const result = lines.map((line) => {
    if (!isProseLine(line)) return line;
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

  return {
    output: result.join('\n'),
    replacements,
    charsSaved,
    examples,
    stat: {
      transformId: 'article-removal',
      replacements,
      charsSaved,
      risk: 'medium' as const,
      examples,
    },
  };
}

const RULES = [
  // "the " before lowercase
  { pattern: /\b(the|a|an)\s+(?=[a-z][a-z])/gi, replacement: '' },
  // "The " before uppercase at sentence start — more aggressive but safe for LLM context
  { pattern: /\b(The|A|An)\s+(?=[A-Z][a-z])/g, replacement: '' },
];

export function articleRemoval(input: string) {
  return applyToProseOnly(input, RULES);
}
