import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TOKENTRIM_VERSION } from './version';
import { createCompressionReport } from './compression/reporting';
import { compress } from './compression/pipeline';
import * as compressionApi from './compression';

function readPackageVersion(): string {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string };
  return pkg.version;
}

function readLatestChangelogVersion(): string {
  const text = fs.readFileSync(path.resolve(process.cwd(), 'CHANGELOG.md'), 'utf8');
  const match = text.match(/^##\s+([^\s]+)\s+-/m);
  return match?.[1] ?? '';
}

describe('release consistency', () => {
  it('keeps package/ui/report/changelog versions aligned', () => {
    const pkg = readPackageVersion();
    const changelog = readLatestChangelogVersion();
    expect(TOKENTRIM_VERSION).toBe(pkg);
    expect(changelog).toBe(pkg);

    const report = createCompressionReport(compress('sample text', { mode: 'light' }));
    expect(report.version).toBe(pkg);
  });

  it('exports documented advanced APIs', () => {
    expect(typeof compressionApi.compress).toBe('function');
    expect(typeof compressionApi.optimizeToBudget).toBe('function');
    expect(typeof compressionApi.estimateTokens).toBe('function');
    expect(typeof compressionApi.listProfiles).toBe('function');
    expect(typeof compressionApi.createCompressionReport).toBe('function');
  });

  it('advanced implementation files exist', () => {
    const required = [
      'src/compression/budgetOptimizer.ts',
      'src/compression/reporting.ts',
      'src/compression/profiles.ts',
      'src/compression/safety/semanticValidator.ts',
    ];
    for (const rel of required) {
      expect(fs.existsSync(path.resolve(process.cwd(), rel))).toBe(true);
    }
  });

  it('documents implemented CLI flags in source', () => {
    const cliSource = fs.readFileSync(path.resolve(process.cwd(), 'src/cli.ts'), 'utf8');
    for (const flag of ['--mode', '--profile', '--target-tokens', '--max-risk', '--tokenizer', '--enabled-transforms', '--out', '--report', '--format', '--recursive', '--dry-run']) {
      expect(cliSource.includes(flag)).toBe(true);
    }
  });
});
