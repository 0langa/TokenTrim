#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { compress, decompress, listProfiles } from './compression/pipeline';

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function readPositional(index: number): string | undefined {
  const args = process.argv.slice(2).filter((x: string) => !x.startsWith('--'));
  return args[index];
}

const cmd = readPositional(0);

if (!cmd || cmd === 'help') {
  console.log('tokentrim compress <file> --profile <id> [--out file] [--legend file]');
  console.log('tokentrim decompress <file> --legend <legend.json> [--out file]');
  console.log('tokentrim batch <dir> --profile <id>');
  console.log('profiles:', listProfiles().map((p) => p.id).join(', '));
  process.exit(0);
}

if (cmd === 'compress') {
  const file = readPositional(1);
  if (!file) throw new Error('Missing input file');
  const profile = readArg('--profile') ?? 'lossless-light';
  const outFile = readArg('--out');
  const legendFile = readArg('--legend');
  const text = fs.readFileSync(file, 'utf8');
  const result = compress(text, { profileId: profile });
  if (outFile) fs.writeFileSync(outFile, result.output, 'utf8');
  else process.stdout.write(result.output);
  if (legendFile && result.legend) fs.writeFileSync(legendFile, JSON.stringify(result.legend, null, 2), 'utf8');
  process.exit(result.validation.passed ? 0 : 2);
}

if (cmd === 'decompress') {
  const file = readPositional(1);
  const legendFile = readArg('--legend');
  if (!file || !legendFile) throw new Error('Need input file and --legend');
  const text = fs.readFileSync(file, 'utf8');
  const legend = JSON.parse(fs.readFileSync(legendFile, 'utf8')) as Record<string, string>;
  const output = decompress(text, legend);
  const outFile = readArg('--out');
  if (outFile) fs.writeFileSync(outFile, output, 'utf8');
  else process.stdout.write(output);
  process.exit(0);
}

if (cmd === 'batch') {
  const dir = readPositional(1);
  const profile = readArg('--profile') ?? 'docs-readme';
  if (!dir) throw new Error('Missing directory');
  const files = fs.readdirSync(dir).filter((f: string) => fs.statSync(path.join(dir, f)).isFile());
  for (const file of files) {
    const full = path.join(dir, file);
    const text = fs.readFileSync(full, 'utf8');
    const result = compress(text, { profileId: profile });
    console.log(`${file}\t${result.metrics.originalChars}\t${result.metrics.outputChars}\t${result.validation.passed ? 'ok' : 'failed'}`);
  }
  process.exit(0);
}

throw new Error(`Unknown command: ${cmd}`);
