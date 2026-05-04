import { applyRules } from './shared';

const RULES = [
  // Remove HTML/XML comments
  { pattern: /<!--[\s\S]*?-->/g, replacement: '' },
  // Collapse multiple spaces in attributes
  { pattern: /\s{2,}/g, replacement: ' ' },
  // Normalize entities
  { pattern: /&nbsp;/gi, replacement: ' ' },
  { pattern: /&quot;/g, replacement: '"' },
  { pattern: /&apos;/g, replacement: "'" },
  { pattern: /&lt;/g, replacement: '<' },
  { pattern: /&gt;/g, replacement: '>' },
  { pattern: /&amp;/g, replacement: '&' },
  // Remove empty lines between tags
  { pattern: />\s*\n\s*</g, replacement: '><' },
];

export function xmlTransform(input: string) {
  return applyRules(input, 'xml', 'safe', RULES);
}
