/**
 * TokenTrim benchmark runner.
 * Requires: npm run build (creates dist/pipeline.js)
 *
 * Usage:
 *   npm run benchmark
 *   npm run benchmark -- --format json
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pipelinePath = path.join(root, 'dist', 'pipeline.js');

if (!existsSync(pipelinePath)) {
  console.error('Error: dist/pipeline.js not found. Run `npm run build` first.');
  process.exit(1);
}

const { compress } = await import(pathToFileURL(pipelinePath).href);

const args = process.argv.slice(2);
const fmtIdx = args.indexOf('--format');
const jsonFormat = fmtIdx !== -1 && args[fmtIdx + 1] === 'json';

const FIXTURES_DIR = path.join(root, 'benchmarks', 'fixtures');

/** @type {Array<{file: string, profile: string, mode: string}>} */
const RUNS = [
  { file: 'agent-context.md', profile: 'agent-context', mode: 'normal' },
  { file: 'agent-context.md', profile: 'agent-context', mode: 'heavy' },
  { file: 'markdown-doc.md', profile: 'markdown-docs', mode: 'normal' },
  { file: 'markdown-doc.md', profile: 'markdown-docs', mode: 'heavy' },
  { file: 'build-log.txt', profile: 'logs', mode: 'heavy' },
  { file: 'chat-history.md', profile: 'chat-history', mode: 'heavy' },
  { file: 'repo-context.md', profile: 'repo-context', mode: 'heavy' },
];

const results = [];

for (const run of RUNS) {
  const filePath = path.join(FIXTURES_DIR, run.file);
  if (!existsSync(filePath)) {
    console.warn(`Fixture not found: ${run.file}`);
    continue;
  }

  const text = readFileSync(filePath, 'utf8');
  const t0 = performance.now();
  const result = compress(text, {
    mode: run.mode,
    profile: run.profile,
    maxRisk: 'medium',
    tokenizer: 'approx-generic',
  });
  const elapsed = performance.now() - t0;

  const charSavingsPct = result.metrics.originalChars > 0
    ? Math.round((result.metrics.charSavings / result.metrics.originalChars) * 100)
    : 0;
  const tokSavingsPct = result.metrics.estimatedTokensBefore > 0
    ? Math.round((result.metrics.estimatedTokenSavings / result.metrics.estimatedTokensBefore) * 100)
    : 0;

  results.push({
    fixture: run.file,
    mode: run.mode,
    profile: run.profile,
    charsIn: result.metrics.originalChars,
    charsOut: result.metrics.outputChars,
    tokensIn: result.metrics.estimatedTokensBefore,
    tokensOut: result.metrics.estimatedTokensAfter,
    charSavingsPct,
    tokSavingsPct,
    durationMs: Math.round(elapsed * 10) / 10,
    safetyIssues: result.safetyIssues.length,
    rejectedTransforms: result.rejectedTransforms.length,
  });
}

if (jsonFormat) {
  console.log(JSON.stringify(results, null, 2));
} else {
  const COL = (s, n) => String(s).padEnd(n);
  const RCOL = (s, n) => String(s).padStart(n);

  console.log('\nTokenTrim Benchmark Results\n');
  const header = [
    COL('fixture', 24),
    COL('mode', 8),
    COL('profile', 16),
    RCOL('chars in', 10),
    RCOL('chars out', 10),
    RCOL('tok in', 8),
    RCOL('tok out', 8),
    RCOL('char%', 6),
    RCOL('tok%', 6),
    RCOL('ms', 7),
    RCOL('issues', 7),
    RCOL('reject', 7),
  ].join('  ');
  console.log(header);
  console.log('─'.repeat(header.length));

  for (const r of results) {
    console.log([
      COL(r.fixture, 24),
      COL(r.mode, 8),
      COL(r.profile, 16),
      RCOL(r.charsIn, 10),
      RCOL(r.charsOut, 10),
      RCOL(r.tokensIn, 8),
      RCOL(r.tokensOut, 8),
      RCOL(`${r.charSavingsPct}%`, 6),
      RCOL(`${r.tokSavingsPct}%`, 6),
      RCOL(`${r.durationMs}`, 7),
      RCOL(r.safetyIssues, 7),
      RCOL(r.rejectedTransforms, 7),
    ].join('  '));
  }
  console.log('');
}
