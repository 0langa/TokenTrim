import { findTransform } from '../src/compression/transformRegistry.js';
import { validateSemanticSafety } from '../src/compression/safety/semanticValidator.js';
import { extractRequirements, extractNegations } from '../src/compression/safety/extractors.js';

const sample = `The system must not lose any technical accuracy. Do not hesitate to contact us.`;

let state = sample;
const mode = 'ultra';
const transformIds = [
  'markdown-cleanup', 'structured-data', 'filler-removal', 'numeric',
  'prose-rewrite:common', 'contraction', 'synonym', 'punctuation',
  'repeated-word', 'number-range', 'time-duration', 'pleonasm',
  'article-removal', 'abbreviation', 'operator', 'caveman-compaction',
  'deduplication', 'section-salience', 'log-compression',
];

for (const id of transformIds) {
  const t = findTransform(id);
  if (!t || !t.defaultModes.includes(mode)) continue;
  const before = state;
  const result = t.apply(before, { mode, tokenizer: 'approx-generic' });
  const issues = validateSemanticSafety(before, result.output, [], []);
  const hasError = issues.some((i) => i.severity === 'error');
  if (id === 'contraction') {
    console.log('\n=== CONTRACTION DEBUG ===');
    console.log('  before:', before);
    console.log('  after: ', result.output);
    console.log('  before reqs:', extractRequirements(before));
    console.log('  after reqs: ', extractRequirements(result.output));
    console.log('  before negs:', extractNegations(before));
    console.log('  after negs: ', extractNegations(result.output));
    for (const i of issues) {
      console.log('  ISSUE:', i.severity, i.category, i.message);
    }
  }
  if (hasError) {
    console.log('\n=== ' + id + ' REJECTED ===');
    for (const i of issues) {
      if (i.severity === 'error') {
        console.log('  ERROR:', i.category + ':', i.message);
      }
    }
  } else {
    state = result.output;
    if (result.stat.replacements > 0) {
      console.log(id + ': ' + result.stat.replacements + ' replacements');
    }
  }
}
console.log('\nFinal output:', state);
