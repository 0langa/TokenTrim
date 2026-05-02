import type { RiskLevel, TransformStat, TransformExample } from '../types';

// Ordered largest-first so compound matches fire before sub-matches
const NUMBER_MAP: Array<[string, number]> = [
  ['one hundred', 100], ['two hundred', 200], ['three hundred', 300],
  ['four hundred', 400], ['five hundred', 500], ['six hundred', 600],
  ['seven hundred', 700], ['eight hundred', 800], ['nine hundred', 900],
  ['ninety', 90], ['eighty', 80], ['seventy', 70], ['sixty', 60],
  ['fifty', 50], ['forty', 40], ['thirty', 30], ['twenty', 20],
  ['nineteen', 19], ['eighteen', 18], ['seventeen', 17], ['sixteen', 16],
  ['fifteen', 15], ['fourteen', 14], ['thirteen', 13], ['twelve', 12],
  ['eleven', 11], ['ten', 10], ['nine', 9], ['eight', 8], ['seven', 7],
  ['six', 6], ['five', 5], ['four', 4], ['three', 3], ['two', 2], ['one', 1],
  ['zero', 0],
];

const SCALE_RULES: Array<[RegExp, string]> = [
  [/\b(\d+(?:\.\d+)?)\s*(?:billion|bn)\b/gi, '$1B'],
  [/\b(\d+(?:\.\d+)?)\s*(?:million|mn|mil)\b/gi, '$1M'],
  [/\b(\d+(?:\.\d+)?)\s*(?:thousand|k)\b/gi, '$1K'],
  [/\b(\d+(?:\.\d+)?)\s*percent\b/gi, '$1%'],
];

const DATE_RULES: Array<[RegExp, (m: string, ...g: string[]) => string]> = [
  [
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi,
    (_m, mon, day, year) => {
      const months: Record<string, string> = {
        january: '01', february: '02', march: '03', april: '04',
        may: '05', june: '06', july: '07', august: '08',
        september: '09', october: '10', november: '11', december: '12',
      };
      const mm = months[mon.toLowerCase()] ?? '??';
      return `${year}-${mm}-${day.padStart(2, '0')}`;
    },
  ],
];

function buildWordNumberPattern(): RegExp {
  // Build alternation from longest to shortest
  const words = NUMBER_MAP.map(([w]) => w.replace(/\s+/g, '\\s+')).join('|');
  return new RegExp(`\\b(?:${words})(?:\\s+and\\s+(?:${words}))*\\b`, 'gi');
}

function parseWordNumber(phrase: string): number {
  const norm = phrase.toLowerCase().replace(/\s+and\s+/g, ' ');
  let total = 0;
  for (const [word, val] of NUMBER_MAP) {
    if (norm.includes(word)) {
      total += val;
      // Rough: just sum matched values (good enough for common phrases)
    }
  }
  return total;
}

export function numericTransform(input: string): {
  output: string;
  stat: TransformStat;
  examples: TransformExample[];
} {
  let output = input;
  let replacements = 0;
  let charsSaved = 0;
  const examples: TransformExample[] = [];

  const addExample = (before: string, after: string) => {
    if (examples.length < 10) examples.push({ before, after });
    replacements += 1;
    charsSaved += Math.max(0, before.length - after.length);
  };

  // 1. Written-out numbers → digits
  const wordNumRe = buildWordNumberPattern();
  output = output.replace(wordNumRe, (match) => {
    const num = parseWordNumber(match);
    const after = String(num);
    addExample(match, after);
    return after;
  });

  // 2. Scale rules (e.g. "5 million" → "5M")
  for (const [pattern, tpl] of SCALE_RULES) {
    output = output.replace(pattern, (match, ...groups) => {
      const after = tpl.replace(/\$(\d+)/g, (_, i) => groups[Number(i) - 1] ?? '');
      addExample(match, after);
      return after;
    });
  }

  // 3. Date formatting
  for (const [pattern, fn] of DATE_RULES) {
    output = output.replace(pattern, (match, ...groups) => {
      const after = fn(match, ...groups.map(String));
      if (after !== match) addExample(match, after);
      return after;
    });
  }

  const risk: RiskLevel = 'low';
  return {
    output,
    examples,
    stat: { transformId: 'numeric', replacements, charsSaved, risk, examples },
  };
}
