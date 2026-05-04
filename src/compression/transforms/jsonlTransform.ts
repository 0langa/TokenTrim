import { applyRules } from './shared';

const RULES = [
  // Minify JSON lines: remove spaces after colons and commas
  { pattern: /":\s+/g, replacement: '":' },
  { pattern: /,\s+/g, replacement: ',' },
  // Remove trailing commas in objects/arrays
  { pattern: /,(\s*[}\]])/g, replacement: '$1' },
];

export function jsonlTransform(input: string) {
  return applyRules(input, 'jsonl', 'safe', RULES);
}
