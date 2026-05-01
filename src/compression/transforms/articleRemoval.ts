import { applyRules } from './shared';

const RULES = [
  { pattern: /\b(the|a|an)\s+(?=[a-z][a-z])/g, replacement: '' },
];

export function articleRemoval(input: string) {
  return applyRules(input, 'article-removal', 'medium', RULES);
}
