import { applyRules, type Rule } from './shared';

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
  return applyRules(input, 'operator', 'high', [becauseRule, ...BASE]);
}
