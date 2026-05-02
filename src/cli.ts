#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { compress } from './compression/pipeline';
import { optimizeToBudget } from './compression/budgetOptimizer';
import { createCompressionReport } from './compression/reporting';
import { mapLegacyProfileToMode } from './compression/modes';
import { listProfiles } from './compression/profiles';
import type { CompressionMode, CompressionOptions, CompressionProfile, RiskLevel, TokenizerKind } from './compression/types';

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function readPositional(index: number): string | undefined {
  const args = process.argv.slice(2).filter((x: string) => !x.startsWith('--'));
  return args[index];
}

function parseMode(): CompressionMode | undefined {
  const mode = readArg('--mode') as CompressionMode | undefined;
  if (mode && ['light', 'normal', 'heavy', 'ultra', 'custom'].includes(mode)) return mode;
  const legacy = readArg('--profileId');
  if (legacy) return mapLegacyProfileToMode(legacy);
  return undefined;
}

function parseOptions(): CompressionOptions {
  const mode = parseMode();
  const profile = readArg('--profile') as CompressionProfile | undefined;
  const tokenizer = (readArg('--tokenizer') as TokenizerKind | undefined) ?? 'approx-generic';
  const target = readArg('--target-tokens');
  const maxRisk = readArg('--max-risk') as RiskLevel | undefined;
  const enabledTransforms = readArg('--enabled-transforms')?.split(',').map((x) => x.trim()).filter(Boolean);
  return {
    mode,
    profile,
    tokenizer,
    targetTokens: target ? Number(target) : undefined,
    maxRisk,
    enabledTransforms,
  };
}

function walkFiles(dir: string, recursive: boolean): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) out.push(...walkFiles(full, true));
    } else if (entry.isFile()) out.push(full);
  }
  return out;
}

function runCompression(text: string, options: CompressionOptions) {
  if (options.targetTokens) return optimizeToBudget(text, options);
  return compress(text, options);
}

const cmd = readPositional(0);

if (!cmd || cmd === 'help') {
  console.log('tokentrim compress <file> --mode heavy --out file.trim.md');
  console.log('tokentrim batch <dir> --recursive --out ./trimmed --profile markdown-docs');
  console.log('tokentrim report <file> --mode heavy --out report.json');
  console.log('tokentrim stdin --mode normal');
  console.log('profiles:', listProfiles().join(', '));
  process.exit(0);
}

if (cmd === 'stdin') {
  const input = fs.readFileSync(0, 'utf8');
  const result = runCompression(input, parseOptions());
  process.stdout.write(result.output);
  process.exit(result.error ? 2 : 0);
}

if (cmd === 'compress') {
  const file = readPositional(1);
  if (!file) throw new Error('Missing input file');
  const options = parseOptions();
  const text = fs.readFileSync(file, 'utf8');
  const result = runCompression(text, options);
  const outFile = readArg('--out');
  const reportPath = readArg('--report');
  const dryRun = hasFlag('--dry-run');

  if (!dryRun) {
    if (outFile) fs.writeFileSync(outFile, result.output, 'utf8');
    else process.stdout.write(result.output);
    if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(createCompressionReport(result), null, 2), 'utf8');
  }

  process.exit(result.error ? 2 : 0);
}

if (cmd === 'report') {
  const file = readPositional(1);
  if (!file) throw new Error('Missing input file');
  const text = fs.readFileSync(file, 'utf8');
  const result = runCompression(text, parseOptions());
  const payload = JSON.stringify(createCompressionReport(result), null, 2);
  const outFile = readArg('--out');
  if (outFile) fs.writeFileSync(outFile, payload, 'utf8');
  else process.stdout.write(payload);
  process.exit(result.error ? 2 : 0);
}

if (cmd === 'batch') {
  const dir = readPositional(1);
  if (!dir) throw new Error('Missing directory');
  const options = parseOptions();
  const recursive = hasFlag('--recursive');
  const outDir = readArg('--out');
  const dryRun = hasFlag('--dry-run');
  const files = walkFiles(dir, recursive);

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const result = runCompression(text, options);
    const rel = path.relative(dir, file);
    console.log(`${rel}\t${result.metrics.originalChars}\t${result.metrics.outputChars}\t${result.error ? 'failed' : 'ok'}`);

    if (outDir && !dryRun) {
      const target = path.join(outDir, `${rel}.trim.txt`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, result.output, 'utf8');
      const report = readArg('--report');
      if (report) {
        const rp = path.join(outDir, `${rel}.report.json`);
        fs.mkdirSync(path.dirname(rp), { recursive: true });
        fs.writeFileSync(rp, JSON.stringify(createCompressionReport(result), null, 2), 'utf8');
      }
    }
  }
  process.exit(0);
}

throw new Error(`Unknown command: ${cmd}`);
