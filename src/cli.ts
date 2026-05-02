import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compress } from './compression/pipeline';
import { optimizeToBudget } from './compression/budgetOptimizer';
import { createCompressionReport } from './compression/reporting';
import { mapLegacyProfileToMode } from './compression/modes';
import { listProfiles } from './compression/profiles';
import { getAllTransformIds } from './compression/transformRegistry';
import { TOKENTRIM_VERSION } from './version';
import type { CompressionMode, CompressionOptions, CompressionProfile, RiskLevel, TokenizerKind } from './compression/types';

type CliFormat = 'json' | 'text';

type CliContext = {
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
};

const VALID_MODES: CompressionMode[] = ['light', 'normal', 'heavy', 'ultra', 'custom'];
const VALID_TOKENIZERS: TokenizerKind[] = ['approx-generic', 'openai-cl100k', 'openai-o200k'];
const VALID_RISKS: RiskLevel[] = ['safe', 'low', 'medium', 'high'];
const VALID_FORMATS: CliFormat[] = ['json', 'text'];
const VALID_PROFILES: CompressionProfile[] = listProfiles();
const VALID_TRANSFORMS = new Set(getAllTransformIds());

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]) {
  const flags = new Map<string, string | true>();
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (part.startsWith('--')) {
      if (part === '--recursive' || part === '--dry-run' || part === '--help') {
        flags.set(part, true);
      } else {
        const value = argv[i + 1];
        if (!value || value.startsWith('--')) fail(`Missing value for ${part}`);
        flags.set(part, value);
        i += 1;
      }
    } else {
      positional.push(part);
    }
  }
  return { positional, flags };
}

function readEnum<T extends string>(value: string | undefined, values: readonly T[], label: string): T | undefined {
  if (value === undefined) return undefined;
  if (!values.includes(value as T)) {
    fail(`Invalid ${label}: ${value}. Allowed: ${values.join(', ')}`);
  }
  return value as T;
}

function parsePositiveInt(value: string | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) fail(`${label} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) fail(`${label} must be a positive integer`);
  return parsed;
}

function parseMode(flags: Map<string, string | true>): CompressionMode | undefined {
  const mode = readEnum((flags.get('--mode') as string | undefined), VALID_MODES, '--mode');
  if (mode) return mode;
  const legacy = flags.get('--profileId') as string | undefined;
  if (legacy) return mapLegacyProfileToMode(legacy);
  return undefined;
}

function parseOptions(flags: Map<string, string | true>): CompressionOptions {
  const mode = parseMode(flags);
  const profile = readEnum((flags.get('--profile') as string | undefined), VALID_PROFILES, '--profile');
  const tokenizer = readEnum((flags.get('--tokenizer') as string | undefined) ?? 'approx-generic', VALID_TOKENIZERS, '--tokenizer');
  const maxRisk = readEnum((flags.get('--max-risk') as string | undefined), VALID_RISKS, '--max-risk');
  const targetTokens = parsePositiveInt(flags.get('--target-tokens') as string | undefined, '--target-tokens');

  const enabledRaw = flags.get('--enabled-transforms') as string | undefined;
  const enabledTransforms = enabledRaw
    ?.split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  if (enabledTransforms) {
    const unknown = enabledTransforms.filter((id) => !VALID_TRANSFORMS.has(id));
    if (unknown.length > 0) {
      fail(`Unknown transform id(s): ${unknown.join(', ')}`);
    }
  }

  return {
    mode,
    profile,
    tokenizer,
    maxRisk,
    targetTokens,
    enabledTransforms,
  };
}

function runCompression(text: string, options: CompressionOptions) {
  if (options.targetTokens) return optimizeToBudget(text, options);
  return compress(text, options);
}

function walkFiles(dir: string, recursive: boolean): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) out.push(...walkFiles(full, true));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function printHelp(ctx: CliContext): void {
  ctx.stdout.write(`TokenTrim v${TOKENTRIM_VERSION}\n`);
  ctx.stdout.write('tokentrim compress <file> --mode heavy --out file.trim.md\n');
  ctx.stdout.write('tokentrim batch <dir> --recursive --out ./trimmed --profile markdown-docs\n');
  ctx.stdout.write('tokentrim report <file> --mode heavy --out report.json\n');
  ctx.stdout.write('tokentrim stdin --mode normal\n');
  ctx.stdout.write(`profiles: ${VALID_PROFILES.join(', ')}\n`);
}

export function runCli(argv: string[], ctx: CliContext = { stdout: process.stdout, stderr: process.stderr }): number {
  try {
    const { positional, flags } = parseArgs(argv);
    const cmd = positional[0];

    if (!cmd || cmd === 'help' || flags.has('--help')) {
      printHelp(ctx);
      return 0;
    }

    const options = parseOptions(flags);
    const outFile = flags.get('--out') as string | undefined;
    const reportPath = flags.get('--report') as string | undefined;
    const dryRun = flags.has('--dry-run');

    if (cmd === 'stdin') {
      const input = fs.readFileSync(0, 'utf8');
      const result = runCompression(input, options);
      if (!dryRun) {
        ctx.stdout.write(result.output);
        if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(createCompressionReport(result), null, 2), 'utf8');
      }
      return result.error ? 2 : 0;
    }

    if (cmd === 'compress') {
      const file = positional[1];
      if (!file) fail('Missing input file');
      const text = fs.readFileSync(file, 'utf8');
      const result = runCompression(text, options);
      if (!dryRun) {
        if (outFile) fs.writeFileSync(outFile, result.output, 'utf8');
        else ctx.stdout.write(result.output);
        if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(createCompressionReport(result), null, 2), 'utf8');
      }
      return result.error ? 2 : 0;
    }

    if (cmd === 'report') {
      const file = positional[1];
      if (!file) fail('Missing input file');
      const format = readEnum((flags.get('--format') as string | undefined) ?? 'json', VALID_FORMATS, '--format');
      const text = fs.readFileSync(file, 'utf8');
      const result = runCompression(text, options);
      const payload = format === 'json' ? JSON.stringify(createCompressionReport(result), null, 2) : result.output;
      if (!dryRun) {
        if (outFile) fs.writeFileSync(outFile, payload, 'utf8');
        else ctx.stdout.write(payload);
      }
      return result.error ? 2 : 0;
    }

    if (cmd === 'batch') {
      const dir = positional[1];
      if (!dir) fail('Missing directory');
      const recursive = flags.has('--recursive');
      const files = walkFiles(dir, recursive);
      if (!recursive && files.some((f) => path.dirname(f) !== path.resolve(dir))) {
        fail('Non-recursive batch cannot traverse nested directories. Use --recursive.');
      }

      for (const file of files) {
        const text = fs.readFileSync(file, 'utf8');
        const result = runCompression(text, options);
        const rel = path.relative(dir, file);
        ctx.stdout.write(`${rel}\t${result.metrics.originalChars}\t${result.metrics.outputChars}\t${result.error ? 'failed' : 'ok'}\n`);

        if (outFile && !dryRun) {
          const target = path.join(outFile, `${rel}.trim.txt`);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, result.output, 'utf8');
          if (reportPath) {
            const reportOut = path.join(outFile, `${rel}.report.json`);
            fs.mkdirSync(path.dirname(reportOut), { recursive: true });
            fs.writeFileSync(reportOut, JSON.stringify(createCompressionReport(result), null, 2), 'utf8');
          }
        }
      }
      return 0;
    }

    fail(`Unknown command: ${cmd}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr.write(`Error: ${message}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const code = runCli(process.argv.slice(2));
  process.exit(code);
}
