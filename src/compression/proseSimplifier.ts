// Prose simplification: replaces verbose phrases/words with short synonyms
// and removes articles from prose. Code blocks and inline code are protected.
// One-way transformation — not reversible, by design.

// Verbose multi-word phrases → concise replacements (longer patterns first)
const PHRASE_MAP: Array<[RegExp, string]> = [
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bin the event that\b/gi, 'if'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\ba large number of\b/gi, 'many'],
  [/\bwith regard to\b/gi, 'about'],
  [/\bin relation to\b/gi, 'about'],
  [/\bwith respect to\b/gi, 'about'],
  [/\bin order to\b/gi, 'to'],
  [/\bas well as\b/gi, 'and'],
  [/\bin addition to\b/gi, 'and'],
  [/\bprior to\b/gi, 'before'],
  [/\bsubsequent to\b/gi, 'after'],
  [/\bmake use of\b/gi, 'use'],
  [/\bis able to\b/gi, 'can'],
  [/\bare able to\b/gi, 'can'],
  [/\bhas the ability to\b/gi, 'can'],
  [/\bhave the ability to\b/gi, 'can'],
  [/\bwith the exception of\b/gi, 'except'],
  [/\bregardless of the fact that\b/gi, 'although'],
  [/\bin spite of the fact that\b/gi, 'although'],
];

// Verbose single words → short synonyms (inflected forms listed explicitly)
const WORD_MAP: Array<[RegExp, string]> = [
  [/\butilization\b/gi, 'use'],
  [/\butilizing\b/gi, 'using'],
  [/\butilized\b/gi, 'used'],
  [/\butilizes\b/gi, 'uses'],
  [/\butilize\b/gi, 'use'],
  [/\bleveraging\b/gi, 'using'],
  [/\bleveraged\b/gi, 'used'],
  [/\bleverages\b/gi, 'uses'],
  [/\bleverage\b/gi, 'use'],
  [/\bfacilitation\b/gi, 'help'],
  [/\bfacilitating\b/gi, 'helping'],
  [/\bfacilitated\b/gi, 'helped'],
  [/\bfacilitates\b/gi, 'helps'],
  [/\bfacilitate\b/gi, 'help'],
  [/\bcommencement\b/gi, 'start'],
  [/\bcommencing\b/gi, 'starting'],
  [/\bcommenced\b/gi, 'started'],
  [/\bcommences\b/gi, 'starts'],
  [/\bcommence\b/gi, 'start'],
  [/\btermination\b/gi, 'end'],
  [/\bterminating\b/gi, 'ending'],
  [/\bterminated\b/gi, 'ended'],
  [/\bterminates\b/gi, 'ends'],
  [/\bterminate\b/gi, 'end'],
  [/\bdemonstrating\b/gi, 'showing'],
  [/\bdemonstrated\b/gi, 'showed'],
  [/\bdemonstrates\b/gi, 'shows'],
  [/\bdemonstrate\b/gi, 'show'],
  [/\bfunctionality\b/gi, 'features'],
  [/\bmodifications\b/gi, 'changes'],
  [/\bmodification\b/gi, 'change'],
  [/\bapproximately\b/gi, '~'],
  [/\bnevertheless\b/gi, 'still'],
  [/\bconsequently\b/gi, 'so'],
  [/\bsubsequently\b/gi, 'then'],
  [/\bfurthermore\b/gi, 'also'],
  [/\badditionally\b/gi, 'also'],
  [/\btherefore\b/gi, 'so'],
  [/\bhowever\b/gi, 'but'],
  [/\bextensively\b/gi, 'widely'],
  [/\bextensive\b/gi, 'large'],
  [/\brequirements\b/gi, 'reqs'],
  [/\brequirement\b/gi, 'req'],
  [/\bsignificantly\b/gi, 'greatly'],
  [/\bimplementation\b/gi, 'impl'],
  [/\bimplementations\b/gi, 'impls'],
];

function preserveCase(original: string, replacement: string): string {
  if (
    replacement.length > 0 &&
    original.length > 0 &&
    original[0] >= 'A' && original[0] <= 'Z' &&
    replacement[0] >= 'a' && replacement[0] <= 'z'
  ) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function simplifyProse(text: string): string {
  // Protect fenced code blocks (```...```) from substitution
  const codeBlocks: string[] = [];
  let out = text.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m);
    return `\x02CB${codeBlocks.length - 1}\x02`;
  });

  // Protect inline code (`...`)
  const inlineCode: string[] = [];
  out = out.replace(/`[^`\n]+`/g, (m) => {
    inlineCode.push(m);
    return `\x02IC${inlineCode.length - 1}\x02`;
  });

  // Apply phrase replacements
  for (const [pattern, replacement] of PHRASE_MAP) {
    out = out.replace(pattern, (m) => preserveCase(m, replacement));
  }

  // Apply word replacements
  for (const [pattern, replacement] of WORD_MAP) {
    out = out.replace(pattern, (m) => preserveCase(m, replacement));
  }

  // Remove articles (the, a, an) before lowercase prose words only.
  // Uppercase/camelCase words (technical terms, acronyms) are protected
  // because they don't match (?=[a-z][a-z]).
  out = out.replace(/\b(the|an?)\s+(?=[a-z][a-z])/g, '');

  // Restore protected regions
  inlineCode.forEach((c, i) => { out = out.replace(`\x02IC${i}\x02`, c); });
  codeBlocks.forEach((c, i) => { out = out.replace(`\x02CB${i}\x02`, c); });

  return out;
}
