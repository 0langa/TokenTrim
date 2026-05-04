import { applyRules } from './shared';

// Collapse repeated words and redundant intensifiers.
const RULES = [
  { pattern: /\b(very|really|quite|pretty|fairly|rather|somewhat)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(very|really|quite|pretty)\s+(very|really|quite|pretty)\b/gi, replacement: '$1' },
  { pattern: /\b(so|too|very|really)\s+(so|too|very|really)\b/gi, replacement: '$1' },
  { pattern: /\b(up|down|over|under|in|out)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(on|off|back|forward)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(more|less|most|least)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(new|old|big|small|good|bad)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(same|different|other|another)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(here|there|where|everywhere)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(now|then|soon|later|before|after)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(always|never|sometimes|often|usually|rarely)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(yes|no|maybe|perhaps|probably)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(ok|okay|ok)\s+\1\b/gi, replacement: 'ok' },
  { pattern: /\b(right|wrong|correct|incorrect)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(true|false)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(done|finished|complete|completed)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(start|started|begin|began)\s+\1\b/gi, replacement: '$1' },
  { pattern: /\b(end|ended|stop|stopped)\s+\1\b/gi, replacement: '$1' },
];

export function repeatedWordTransform(input: string) {
  return applyRules(input, 'repeated-word', 'safe', RULES);
}
