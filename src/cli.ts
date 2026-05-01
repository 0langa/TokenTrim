#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { compress, listModes } from './compression/pipeline';
import { mapLegacyProfileToMode } from './compression/modes';
import type { CompressionMode } from './compression/types';

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function readPositional(index: number): string | undefined {
  const args = process.argv.slice(2).filter((x: string) => !x.startsWith('--'));
  return args[index];
}

function resolveMode(): CompressionMode {
  const mode = readArg('--mode') as CompressionMode | undefined;
  if (mode && ['light', 'normal', 'heavy', 'ultra'].includes(mode)) return mode;
  const legacy = readArg('--profile');
  if (legacy) {
    console.error(`[compat] --profile is deprecated, mapped to mode '${mapLegacyProfileToMode(legacy)}'. Use --mode.`);
    return mapLegacyProfileToMode(legacy);
  }
  return 'normal';
}

const cmd = readPositional(0);

if (!cmd || cmd === 'help') {
  console.log('tokentrim compress <file> --mode <light|normal|heavy|ultra> [--out file]');
  console.log('tokentrim batch <dir> --mode <light|normal|heavy|ultra>');
  console.log('modes:', listModes().map((m) => m.id).join(', '));
  process.exit(0);
}

if (cmd === 'compress') {
  const file = readPositional(1);
  if (!file) throw new Error('Missing input file');
  const mode = resolveMode();
  const outFile = readArg('--out');
  const text = fs.readFileSync(file, 'utf8');
  const result = compress(text, { mode });
  if (outFile) fs.writeFileSync(outFile, result.output, 'utf8');
  else process.stdout.write(result.output);
  process.exit(result.error ? 2 : 0);
}

if (cmd === 'batch') {
  const dir = readPositional(1);
  const mode = resolveMode();
  if (!dir) throw new Error('Missing directory');
  const files = fs.readdirSync(dir).filter((f: string) => fs.statSync(path.join(dir, f)).isFile());
  for (const file of files) {
    const full = path.join(dir, file);
    const text = fs.readFileSync(full, 'utf8');
    const result = compress(text, { mode });
    console.log(`${file}\t${result.metrics.originalChars}\t${result.metrics.outputChars}\t${result.error ? 'failed' : 'ok'}`);
  }
  process.exit(0);
}

throw new Error(`Unknown command: ${cmd}`);
