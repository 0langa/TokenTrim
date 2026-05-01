import { applyRules } from './shared';

const RULES = [
  { pattern: /\brequirements\b/gi, replacement: 'reqs' },
  { pattern: /\brequirement\b/gi, replacement: 'req' },
  { pattern: /\bimplementation\b/gi, replacement: 'impl' },
  { pattern: /\bconfiguration\b/gi, replacement: 'config' },
  { pattern: /\bauthentication\b/gi, replacement: 'auth' },
  { pattern: /\bauthorization\b/gi, replacement: 'authz' },
  { pattern: /\bdatabase\b/g, replacement: 'DB' },
  { pattern: /\brequest\b/gi, replacement: 'req' },
  { pattern: /\bresponse\b/gi, replacement: 'res' },
  { pattern: /\bdocumentation\b/gi, replacement: 'docs' },
  { pattern: /\brepository\b/gi, replacement: 'repo' },
  { pattern: /\bdependency\b/gi, replacement: 'dep' },
];

export function abbreviationTransform(input: string) {
  return applyRules(input, 'abbreviation', 'low', RULES);
}
