import { applyRules } from './shared';

const RULES = [
  // Durations with and
  { pattern: /\b(\d+)\s*hours?\s+and\s+(\d+)\s*minutes?\b/gi, replacement: '$1h$2m' },
  { pattern: /\b(\d+)\s*hours?\s+(\d+)\s*minutes?\b/gi, replacement: '$1h$2m' },
  { pattern: /\b(\d+)\s*minutes?\s+and\s+(\d+)\s*seconds?\b/gi, replacement: '$1m$2s' },
  { pattern: /\b(\d+)\s*minutes?\s+(\d+)\s*seconds?\b/gi, replacement: '$1m$2s' },
  { pattern: /\b(\d+)\s*days?\s+and\s+(\d+)\s*hours?\b/gi, replacement: '$1d$2h' },
  { pattern: /\b(\d+)\s*days?\s+(\d+)\s*hours?\b/gi, replacement: '$1d$2h' },
  // Single units
  { pattern: /\b(\d+)\s*milliseconds?\b/gi, replacement: '$1ms' },
  { pattern: /\b(\d+)\s*seconds?\b/gi, replacement: '$1s' },
  { pattern: /\b(\d+)\s*minutes?\b/gi, replacement: '$1m' },
  { pattern: /\b(\d+)\s*hours?\b/gi, replacement: '$1h' },
  { pattern: /\b(\d+)\s*days?\b/gi, replacement: '$1d' },
  { pattern: /\b(\d+)\s*weeks?\b/gi, replacement: '$1w' },
  { pattern: /\b(\d+)\s*months?\b/gi, replacement: '$1mo' },
  { pattern: /\b(\d+)\s*years?\b/gi, replacement: '$1y' },
  // Common compound
  { pattern: /\ban hour\b/gi, replacement: '1h' },
  { pattern: /\ba minute\b/gi, replacement: '1m' },
  { pattern: /\ba second\b/gi, replacement: '1s' },
  { pattern: /\ban hour and\b/gi, replacement: '1h' },
  { pattern: /\ba minute and\b/gi, replacement: '1m' },
  { pattern: /\ba second and\b/gi, replacement: '1s' },
];

export function timeDurationTransform(input: string) {
  return applyRules(input, 'time-duration', 'low', RULES);
}
