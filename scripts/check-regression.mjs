import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compress } from '../src/compression/pipeline.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../benchmarks/fixtures');
const BASELINE_PATH = path.join(__dirname, '../benchmarks/baseline.json');

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const fixtures = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.md') || f.endsWith('.txt'));

let failed = false;

for (const fixture of fixtures) {
  const text = fs.readFileSync(path.join(FIXTURES_DIR, fixture), 'utf8');
  const key = fixture;
  const expectations = baseline[key];
  if (!expectations) {
    console.log(`⚠️  No baseline for ${fixture}`);
    continue;
  }

  for (const [mode, expected] of Object.entries(expectations)) {
    const start = performance.now();
    const result = compress(text, { mode, profile: 'general' });
    const duration = performance.now() - start;
    const savings = result.metrics.originalChars > 0
      ? (result.metrics.originalChars - result.metrics.outputChars) / result.metrics.originalChars
      : 0;

    if (savings < expected.charSavingsMin) {
      console.error(`❌ ${fixture} ${mode}: savings ${savings.toFixed(3)} < min ${expected.charSavingsMin}`);
      failed = true;
    } else if (savings > expected.charSavingsMax) {
      console.error(`❌ ${fixture} ${mode}: savings ${savings.toFixed(3)} > max ${expected.charSavingsMax}`);
      failed = true;
    } else {
      console.log(`✅ ${fixture} ${mode}: savings ${savings.toFixed(3)} (ok)`);
    }

    if (duration > expected.durationMaxMs) {
      console.error(`❌ ${fixture} ${mode}: duration ${duration.toFixed(0)}ms > max ${expected.durationMaxMs}ms`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\nRegression detected. Update benchmarks/baseline.json if changes are intentional.');
  process.exit(1);
} else {
  console.log('\nAll benchmarks within expected ranges.');
  process.exit(0);
}
