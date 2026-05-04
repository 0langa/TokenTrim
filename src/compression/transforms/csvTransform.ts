import { applyRules } from './shared';

const RULES = [
  // Collapse repeated cells in adjacent rows
  { pattern: /^(.*),(.*),(.*)\n\1,\2,\3$/gm, replacement: '$1,$2,$3 (+1 identical)' },
  // Normalize multiple spaces around commas
  { pattern: /\s*,\s*/g, replacement: ',' },
  // Remove blank lines
  { pattern: /^\s*\n/gm, replacement: '' },
  // Collapse consecutive empty cells
  { pattern: /,,+/g, replacement: ',,' },
];

export function csvTransform(input: string) {
  return applyRules(input, 'csv', 'safe', RULES);
}
