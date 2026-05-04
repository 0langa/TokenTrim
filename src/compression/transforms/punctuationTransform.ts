import { applyRules } from './shared';

const RULES = [
  // Latin abbreviations
  { pattern: /\be\.g\.\s*,?\s*/gi, replacement: 'eg ' },
  { pattern: /\bi\.e\.\s*,?\s*/gi, replacement: 'ie ' },
  { pattern: /\betc\.\s*,?\s*/gi, replacement: 'etc ' },
  { pattern: /\bvs\.\s*/gi, replacement: 'vs ' },
  { pattern: /\bviz\.\s*/gi, replacement: 'viz ' },
  // Collapse repeated punctuation
  { pattern: /!{2,}/g, replacement: '!' },
  { pattern: /\?{2,}/g, replacement: '?' },
  { pattern: /\.{4,}/g, replacement: '...' },
  // Remove space before punctuation
  { pattern: /\s+([.,;:!?)\]}])/g, replacement: '$1' },
  // Clean up double spaces after periods that became single
  { pattern: /  +/g, replacement: ' ' },
  // Smart quotes → ASCII (often fewer tokens)
  { pattern: /[\u2018\u2019]/g, replacement: "'" },
  { pattern: /[\u201C\u201D]/g, replacement: '"' },
  // Em-dash / en-dash → hyphen
  { pattern: /[\u2013\u2014]/g, replacement: '-' },
  // Ellipsis character → three dots
  { pattern: /\u2026/g, replacement: '...' },
  // No-break space → regular space
  { pattern: /\u00A0/g, replacement: ' ' },
];

export function punctuationTransform(input: string) {
  return applyRules(input, 'punctuation', 'safe', RULES);
}
