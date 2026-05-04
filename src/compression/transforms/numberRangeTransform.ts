import { applyRules } from './shared';

const RULES = [
  // Number ranges
  { pattern: /\bfrom\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\b/gi, replacement: '$1-$2' },
  { pattern: /\bbetween\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)\b/gi, replacement: '$1-$2' },
  { pattern: /\branging\s+from\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\b/gi, replacement: '$1-$2' },
  // Approximations
  { pattern: /\bapproximately\s+(\d+(?:\.\d+)?)\b/gi, replacement: '~$1' },
  { pattern: /\babout\s+(\d+(?:\.\d+)?)\b/gi, replacement: '~$1' },
  { pattern: /\baround\s+(\d+(?:\.\d+)?)\b/gi, replacement: '~$1' },
  { pattern: /\broughly\s+(\d+(?:\.\d+)?)\b/gi, replacement: '~$1' },
  { pattern: /\bnearly\s+(\d+(?:\.\d+)?)\b/gi, replacement: '~$1' },
  { pattern: /\balmost\s+(\d+(?:\.\d+)?)\b/gi, replacement: '~$1' },
  { pattern: /\bcirca\s+(\d+(?:\.\d+)?)\b/gi, replacement: '~$1' },
  // Comparisons
  { pattern: /\bmore than\s+(\d+(?:\.\d+)?)\b/gi, replacement: '>$1' },
  { pattern: /\bgreater than\s+(\d+(?:\.\d+)?)\b/gi, replacement: '>$1' },
  { pattern: /\bover\s+(\d+(?:\.\d+)?)\b/gi, replacement: '>$1' },
  { pattern: /\babove\s+(\d+(?:\.\d+)?)\b/gi, replacement: '>$1' },
  { pattern: /\bless than\s+(\d+(?:\.\d+)?)\b/gi, replacement: '<$1' },
  { pattern: /\bfewer than\s+(\d+(?:\.\d+)?)\b/gi, replacement: '<$1' },
  { pattern: /\bunder\s+(\d+(?:\.\d+)?)\b/gi, replacement: '<$1' },
  { pattern: /\bbelow\s+(\d+(?:\.\d+)?)\b/gi, replacement: '<$1' },
  { pattern: /\bat least\s+(\d+(?:\.\d+)?)\b/gi, replacement: '$1+' },
  { pattern: /\bat most\s+(\d+(?:\.\d+)?)\b/gi, replacement: '<=$1' },
  { pattern: /\bup to\s+(\d+(?:\.\d+)?)\b/gi, replacement: '<=$1' },
  { pattern: /\bmaximum of\s+(\d+(?:\.\d+)?)\b/gi, replacement: '<=$1' },
  { pattern: /\bminimum of\s+(\d+(?:\.\d+)?)\b/gi, replacement: '$1+' },
];

export function numberRangeTransform(input: string) {
  return applyRules(input, 'number-range', 'low', RULES);
}
