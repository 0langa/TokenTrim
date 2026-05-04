import { applyRules } from './shared';

// Remove redundant word pairs (pleonasms / tautologies).
const RULES = [
  { pattern: /\badvance\s+planning\b/gi, replacement: 'planning' },
  { pattern: /\badvance\s+plan\b/gi, replacement: 'plan' },
  { pattern: /\badvance\s+notice\b/gi, replacement: 'notice' },
  { pattern: /\badvance\s+warning\b/gi, replacement: 'warning' },
  { pattern: /\bfree\s+gift\b/gi, replacement: 'gift' },
  { pattern: /\bfree\s+of charge\b/gi, replacement: 'free' },
  { pattern: /\bunexpected\s+surprise\b/gi, replacement: 'surprise' },
  { pattern: /\bnew\s+innovation\b/gi, replacement: 'innovation' },
  { pattern: /\bpast\s+history\b/gi, replacement: 'history' },
  { pattern: /\bfuture\s+plans?\b/gi, replacement: 'plans' },
  { pattern: /\bend\s+result\b/gi, replacement: 'result' },
  { pattern: /\bfinal\s+outcome\b/gi, replacement: 'outcome' },
  { pattern: /\btrue\s+fact\b/gi, replacement: 'fact' },
  { pattern: /\bactual\s+fact\b/gi, replacement: 'fact' },
  { pattern: /\bbasic\s+fundamentals?\b/gi, replacement: 'fundamentals' },
  { pattern: /\bjoint\s+collaboration\b/gi, replacement: 'collaboration' },
  { pattern: /\bclose\s+proximity\b/gi, replacement: 'proximity' },
  { pattern: /\bempty\s+space\b/gi, replacement: 'space' },
  { pattern: /\bexact\s+same\b/gi, replacement: 'same' },
  { pattern: /\bcompletely\s+eliminate\b/gi, replacement: 'eliminate' },
  { pattern: /\bcompletely\s+destroy\b/gi, replacement: 'destroy' },
  { pattern: /\butterly\s+destroy\b/gi, replacement: 'destroy' },
  { pattern: /\btotally\s+destroy\b/gi, replacement: 'destroy' },
  { pattern: /\brevert\s+back\b/gi, replacement: 'revert' },
  { pattern: /\breturn\s+back\b/gi, replacement: 'return' },
  { pattern: /\bproceed\s+forward\b/gi, replacement: 'proceed' },
  { pattern: /\brise\s+up\b/gi, replacement: 'rise' },
  { pattern: /\bsink\s+down\b/gi, replacement: 'sink' },
  { pattern: /\bmeet\s+together\b/gi, replacement: 'meet' },
  { pattern: /\bcombine\s+together\b/gi, replacement: 'combine' },
  { pattern: /\bmerge\s+together\b/gi, replacement: 'merge' },
  { pattern: /\bmix\s+together\b/gi, replacement: 'mix' },
  { pattern: /\bconnect\s+together\b/gi, replacement: 'connect' },
  { pattern: /\bjoin\s+together\b/gi, replacement: 'join' },
];

export function pleonasmTransform(input: string) {
  return applyRules(input, 'pleonasm', 'low', RULES);
}
