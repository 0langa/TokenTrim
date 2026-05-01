import { applyRules } from './shared';

const RULES = [
  { pattern: /\bplease note\b/gi, replacement: '' },
  { pattern: /\bit is important to mention\b/gi, replacement: '' },
  { pattern: /\bin general\b/gi, replacement: '' },
  { pattern: /\bbasically\b/gi, replacement: '' },
  { pattern: /\bI think\b/gi, replacement: '' },
  { pattern: /\bI believe\b/gi, replacement: '' },
  { pattern: /\bit should be noted that\b/gi, replacement: '' },
  { pattern: /\bneedless to say\b/gi, replacement: '' },
  { pattern: /\bfor what it'?s worth\b/gi, replacement: '' },
  { pattern: /\bin my opinion\b/gi, replacement: '' },
  { pattern: /\bgenerally speaking\b/gi, replacement: '' },
];

export function fillerRemoval(input: string) {
  return applyRules(input, 'filler-removal', 'medium', RULES);
}
