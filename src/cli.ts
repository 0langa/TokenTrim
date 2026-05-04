import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compress } from './compression/pipeline';
import { optimizeToBudget } from './compression/budgetOptimizer';
import { createCompressionReport } from './compression/reporting';
import { mapLegacyProfileToMode } from './compression/modes';
import { listProfiles } from './compression/profiles';
import { getAllTransformIds, getAllTransforms } from './compression/transformRegistry';
import { estimateTokens } from './compression/tokenizers/index';
import { TOKENTRIM_VERSION } from './version';
import type { CompressionMode, CompressionOptions, CompressionProfile, RiskLevel, TokenizerKind } from './compression/types';
import { loadConfig, STARTER_CONFIG, type CliConfig } from './cli/config';
import { loadIgnorePatterns, walkFilesWithIgnore } from './cli/ignorePatterns';

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

const REPO_TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.md', '.txt', '.rst',
  '.json', '.jsonc',
  '.yaml', '.yml', '.toml',
  '.css', '.scss',
  '.html',
  '.py', '.rb', '.rs', '.go', '.java', '.sh', '.bash',
  '.env.example', '.env.template',
]);

const REPO_PRIORITY_NAMES = [
  'README.md', 'readme.md', 'README.rst',
  'package.json', 'tsconfig.json', 'tsconfig.base.json',
  'vite.config.ts', 'vite.config.js', 'next.config.js', 'next.config.ts',
  'Makefile', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
];

const REPO_MAX_FILE_CHARS = 40_000;

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]) {
  const flags = new Map<string, string | true>();
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (part.startsWith('--')) {
      if (part === '--recursive' || part === '--dry-run' || part === '--help' || part === '--report') {
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

function parseOptions(flags: Map<string, string | true>, cfg: CliConfig): CompressionOptions {
  // CLI flags override config
  const mode = parseMode(flags) ?? cfg.mode;
  const profile = readEnum((flags.get('--profile') as string | undefined), VALID_PROFILES, '--profile') ?? cfg.profile;
  const tokenizer = readEnum((flags.get('--tokenizer') as string | undefined) ?? (cfg.tokenizer ?? 'approx-generic'), VALID_TOKENIZERS, '--tokenizer');
  const maxRisk = readEnum((flags.get('--max-risk') as string | undefined), VALID_RISKS, '--max-risk') ?? cfg.maxRisk;
  const targetTokens = parsePositiveInt(flags.get('--target-tokens') as string | undefined, '--target-tokens') ?? cfg.targetTokens;

  const enabledRaw = flags.get('--enabled-transforms') as string | undefined;
  const enabledTransforms = enabledRaw
    ? enabledRaw.split(',').map((x) => x.trim()).filter(Boolean)
    : cfg.enabledTransforms;

  if (enabledTransforms) {
    const unknown = enabledTransforms.filter((id) => !VALID_TRANSFORMS.has(id));
    if (unknown.length > 0) {
      fail(`Unknown transform id(s): ${unknown.join(', ')}`);
    }
  }

  return {
    mode, profile, tokenizer, maxRisk, targetTokens, enabledTransforms,
    protectPatterns: cfg.protectPatterns,
    requiredPhrases: cfg.requiredPhrases,
  };
}

function runCompression(text: string, options: CompressionOptions) {
  if (options.targetTokens) return optimizeToBudget(text, options);
  return compress(text, options);
}

/** Legacy walkFiles without ignore (kept for backward compat within non-recursive batch) */
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

function buildFileTree(files: string[], root: string): string {
  const rel = files.map((f) => path.relative(root, f).replace(/\\/g, '/'));
  rel.sort();
  const lines: string[] = [];
  let lastDir = '';
  for (const r of rel) {
    const parts = r.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    if (dir !== lastDir) {
      if (dir) lines.push(`${dir}/`);
      lastDir = dir;
    }
    const indent = parts.length > 1 ? '  '.repeat(parts.length - 1) : '';
    lines.push(`${indent}${parts[parts.length - 1]}`);
  }
  return lines.join('\n');
}

function printHelp(ctx: CliContext): void {
  ctx.stdout.write(`TokenTrim v${TOKENTRIM_VERSION}\n`);
  ctx.stdout.write('\nCommands:\n');
  ctx.stdout.write('  tokentrim compress <file> [options]      Compress a single file\n');
  ctx.stdout.write('  tokentrim batch <dir> [options]          Batch compress a directory\n');
  ctx.stdout.write('  tokentrim report <file> [options]        Generate compression report\n');
  ctx.stdout.write('  tokentrim stdin [options]                Compress stdin\n');
  ctx.stdout.write('  tokentrim repo <path> [options]          Generate local context pack\n');
  ctx.stdout.write('  tokentrim watch <path> [options]         Watch file or directory for changes\n');
  ctx.stdout.write('  tokentrim init                           Create starter .tokentrimrc.json\n');
  ctx.stdout.write('  tokentrim list-transforms [--format json] List available transforms\n');
  ctx.stdout.write('  tokentrim list-profiles [--format json]  List available profiles\n');
  ctx.stdout.write('  tokentrim list-tokenizers                List tokenizer kinds\n');
  ctx.stdout.write('  tokentrim list-modes                     List compression modes\n');
  ctx.stdout.write('\nOptions:\n');
  ctx.stdout.write('  --mode light|normal|heavy|ultra|custom\n');
  ctx.stdout.write('  --profile general|agent-context|repo-context|logs|markdown-docs|chat-history\n');
  ctx.stdout.write('  --target-tokens <n>\n');
  ctx.stdout.write('  --max-risk safe|low|medium|high\n');
  ctx.stdout.write('  --tokenizer approx-generic|openai-cl100k|openai-o200k\n');
  ctx.stdout.write('  --enabled-transforms id1,id2,...\n');
  ctx.stdout.write('  --out <path>\n');
  ctx.stdout.write('  --report           Write .report.json alongside --out (batch/repo)\n');
  ctx.stdout.write('  --recursive        Recurse into subdirectories (batch)\n');
  ctx.stdout.write('  --dry-run          Simulate without writing files\n');
  ctx.stdout.write('  --format json|text Output format (report/list commands)\n');
  ctx.stdout.write(`\nProfiles: ${VALID_PROFILES.join(', ')}\n`);
  ctx.stdout.write('\nConfig: .tokentrimrc | .tokentrimrc.json | tokentrim.config.json\n');
  ctx.stdout.write('Ignore:  .tokentrimignore (gitignore-style, for batch --recursive and repo)\n');
}

export function runCli(argv: string[], ctx: CliContext = { stdout: process.stdout, stderr: process.stderr }): number {
  try {
    const { positional, flags } = parseArgs(argv);
    const cmd = positional[0];

    if (!cmd || cmd === 'help' || flags.has('--help')) {
      printHelp(ctx);
      return 0;
    }

    // Load config from cwd (all commands respect it)
    const cfg = loadConfig(process.cwd());

    // --- Discovery commands ---

    if (cmd === 'list-transforms') {
      const fmt = readEnum((flags.get('--format') as string | undefined) ?? 'text', VALID_FORMATS, '--format');
      const transforms = getAllTransforms();
      if (fmt === 'json') {
        ctx.stdout.write(JSON.stringify(transforms.map((t) => ({
          id: t.id,
          label: t.label,
          risk: t.risk,
          defaultModes: t.defaultModes,
          profiles: t.profiles ?? [],
          profileOnly: t.profileOnly ?? false,
          description: t.description ?? '',
        })), null, 2) + '\n');
      } else {
        for (const t of transforms) {
          ctx.stdout.write(`${t.id}\n`);
          ctx.stdout.write(`  label:       ${t.label}\n`);
          ctx.stdout.write(`  risk:        ${t.risk}\n`);
          ctx.stdout.write(`  modes:       ${t.defaultModes.join(', ')}\n`);
          if (t.profiles?.length) ctx.stdout.write(`  profiles:    ${t.profiles.join(', ')}\n`);
          if (t.description) ctx.stdout.write(`  description: ${t.description}\n`);
          ctx.stdout.write('\n');
        }
      }
      return 0;
    }

    if (cmd === 'list-profiles') {
      const fmt = readEnum((flags.get('--format') as string | undefined) ?? 'text', VALID_FORMATS, '--format');
      const profiles = VALID_PROFILES;
      const descriptions: Record<string, string> = {
        'general': 'General-purpose text compression',
        'agent-context': 'AI prompts, agent instructions, and context documents',
        'repo-context': 'Source code and project files for agent context packs',
        'logs': 'Server logs, CI output, and error dumps',
        'markdown-docs': 'Markdown documentation, READMEs, and guides',
        'chat-history': 'Conversation history and meeting notes',
      };
      if (fmt === 'json') {
        ctx.stdout.write(JSON.stringify(profiles.map((p) => ({ id: p, description: descriptions[p] ?? '' })), null, 2) + '\n');
      } else {
        for (const p of profiles) {
          ctx.stdout.write(`${p}\n  ${descriptions[p] ?? ''}\n\n`);
        }
      }
      return 0;
    }

    if (cmd === 'list-tokenizers') {
      const fmt = readEnum((flags.get('--format') as string | undefined) ?? 'text', VALID_FORMATS, '--format');
      const tokenizers = VALID_TOKENIZERS.map((k) => ({ id: k, exact: false, note: 'approximate estimate' }));
      if (fmt === 'json') {
        ctx.stdout.write(JSON.stringify(tokenizers, null, 2) + '\n');
      } else {
        for (const t of tokenizers) {
          ctx.stdout.write(`${t.id}  (${t.note})\n`);
        }
      }
      return 0;
    }

    if (cmd === 'list-modes') {
      const fmt = readEnum((flags.get('--format') as string | undefined) ?? 'text', VALID_FORMATS, '--format');
      const modes = [
        { id: 'light', description: 'Minimal structural cleanup only (~5-15% savings)' },
        { id: 'normal', description: 'Balanced compression (~15-30% savings)' },
        { id: 'heavy', description: 'Aggressive compression (~30-50% savings)' },
        { id: 'ultra', description: 'Maximum compression, reduced readability (~40-65% savings)' },
        { id: 'custom', description: 'Manual transform selection' },
      ];
      if (fmt === 'json') {
        ctx.stdout.write(JSON.stringify(modes, null, 2) + '\n');
      } else {
        for (const m of modes) {
          ctx.stdout.write(`${m.id}\n  ${m.description}\n\n`);
        }
      }
      return 0;
    }

    // --- Init ---

    if (cmd === 'init') {
      const outArg = flags.get('--out') as string | undefined;
      const target = outArg ?? path.join(process.cwd(), '.tokentrimrc.json');
      if (fs.existsSync(target)) {
        ctx.stderr.write(`Config already exists: ${path.basename(target)}\n`);
        return 1;
      }
      fs.writeFileSync(target, JSON.stringify(STARTER_CONFIG, null, 2) + '\n', 'utf8');
      ctx.stdout.write(`Created ${path.basename(target)}\n`);
      return 0;
    }

    if (cmd === 'watch') {
      fail('watch must be run directly (not via API). Use `tokentrim watch <path>`.');
    }

    // --- Compression commands ---

    const options = parseOptions(flags, cfg);
    const outFile = flags.get('--out') as string | undefined;
    const writeReport = flags.has('--report');
    const reportPath = typeof flags.get('--report') === 'string' ? (flags.get('--report') as string) : undefined;
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

      let files: string[];
      let skippedCount = 0;

      if (recursive) {
        const ignorePatterns = loadIgnorePatterns(dir);
        const walkResult = walkFilesWithIgnore(dir, ignorePatterns, dir);
        files = walkResult.included;
        skippedCount = walkResult.skipped;
      } else {
        files = walkFiles(dir, false);
      }

      ctx.stdout.write(`Processing ${files.length} files${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}...\n`);

      for (const file of files) {
        let text: string;
        try {
          text = fs.readFileSync(file, 'utf8');
        } catch {
          ctx.stdout.write(`${path.relative(dir, file)}\t-\t-\tfailed (unreadable)\n`);
          continue;
        }
        const result = runCompression(text, options);
        const rel = path.relative(dir, file);
        ctx.stdout.write(`${rel}\t${result.metrics.originalChars}\t${result.metrics.outputChars}\t${result.error ? 'failed' : 'ok'}\n`);

        if (outFile && !dryRun) {
          const target = path.join(outFile, `${rel}.trim.txt`);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, result.output, 'utf8');
          if (writeReport) {
            const rpt = path.join(outFile, `${rel}.report.json`);
            fs.mkdirSync(path.dirname(rpt), { recursive: true });
            fs.writeFileSync(rpt, JSON.stringify(createCompressionReport(result), null, 2), 'utf8');
          }
        }
      }
      return 0;
    }

    // --- Repo/context pack ---

    if (cmd === 'repo' || cmd === 'context') {
      const dir = path.resolve(positional[1] ?? '.');
      if (!fs.existsSync(dir)) fail(`Directory not found: ${dir}`);

      const ignorePatterns = loadIgnorePatterns(dir);
      const walkResult = walkFilesWithIgnore(dir, ignorePatterns, dir);

      const repoOptions: CompressionOptions = {
        ...options,
        mode: options.mode ?? 'heavy',
        profile: options.profile ?? 'repo-context',
        maxRisk: options.maxRisk ?? 'medium',
      };

      // Partition: priority + text files under size limit
      const allFiles = walkResult.included.filter((f) => {
        const ext = path.extname(f).toLowerCase();
        const base = path.basename(f);
        return REPO_TEXT_EXTENSIONS.has(ext) || base === 'Makefile' || base === 'Dockerfile';
      });

      // Sort: priority files first, then alphabetical
      const isPriority = (f: string) => REPO_PRIORITY_NAMES.includes(path.basename(f));
      allFiles.sort((a, b) => {
        const pa = isPriority(a) ? 0 : 1;
        const pb = isPriority(b) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return a.localeCompare(b);
      });

      const sections: string[] = [];
      const includedFiles: string[] = [];
      let totalCharsBefore = 0;
      let totalCharsAfter = 0;
      let skippedSize = 0;

      for (const file of allFiles) {
        let text: string;
        try {
          text = fs.readFileSync(file, 'utf8');
        } catch {
          continue;
        }
        if (text.length > REPO_MAX_FILE_CHARS) {
          skippedSize += 1;
          continue;
        }

        const result = runCompression(text, repoOptions);
        const rel = path.relative(dir, file).replace(/\\/g, '/');
        const ext = path.extname(file).slice(1) || 'txt';

        totalCharsBefore += result.metrics.originalChars;
        totalCharsAfter += result.metrics.outputChars;
        includedFiles.push(file);

        sections.push(`### ${rel}\n\`\`\`${ext}\n${result.output}\n\`\`\``);
      }

      const tokenBefore = estimateTokens('x'.repeat(totalCharsBefore), repoOptions.tokenizer ?? 'approx-generic');
      const tokenAfter = estimateTokens('x'.repeat(totalCharsAfter), repoOptions.tokenizer ?? 'approx-generic');
      const savingsPct = totalCharsBefore > 0 ? Math.round((1 - totalCharsAfter / totalCharsBefore) * 100) : 0;

      const tree = buildFileTree(includedFiles, dir);

      const header = [
        `# Repository Context: ${path.basename(dir)}`,
        '',
        `Generated by TokenTrim v${TOKENTRIM_VERSION}`,
        '',
        '## Summary',
        '',
        `| Field | Value |`,
        `|---|---|`,
        `| Root | ${dir} |`,
        `| Files scanned | ${walkResult.included.length + walkResult.skipped} |`,
        `| Files included | ${includedFiles.length} |`,
        `| Files skipped | ${walkResult.skipped + (allFiles.length - includedFiles.length)} |`,
        `| Skipped (size limit) | ${skippedSize} |`,
        `| Chars before | ${totalCharsBefore.toLocaleString()} |`,
        `| Chars after | ${totalCharsAfter.toLocaleString()} |`,
        `| ~Tokens before | ~${tokenBefore.tokens.toLocaleString()} |`,
        `| ~Tokens after | ~${tokenAfter.tokens.toLocaleString()} |`,
        `| Savings | ${savingsPct}% |`,
        `| Mode | ${repoOptions.mode} |`,
        `| Profile | ${repoOptions.profile} |`,
        `| Max risk | ${repoOptions.maxRisk} |`,
        `| Tokenizer | ${repoOptions.tokenizer ?? 'approx-generic'} (approximate) |`,
        '',
        '## File Tree',
        '',
        '```',
        tree,
        '```',
        '',
        '## Source Files',
      ].join('\n');

      const output = [header, '', ...sections].join('\n\n');

      if (!dryRun) {
        if (outFile) {
          fs.writeFileSync(outFile, output, 'utf8');
          ctx.stdout.write(`Wrote context pack: ${outFile}\n`);
          ctx.stdout.write(`  ${includedFiles.length} files | ~${savingsPct}% savings | ~${tokenAfter.tokens.toLocaleString()} tokens\n`);
        } else {
          ctx.stdout.write(output);
        }
      }

      return 0;
    }

    fail(`Unknown command: ${cmd}. Run \`tokentrim help\` for usage.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr.write(`Error: ${message}\n`);
    return 1;
  }
}

async function runWatch(argv: string[]): Promise<void> {
  const { positional, flags } = parseArgs(argv);
  const input = positional[0];
  if (!input) fail('watch requires a file or directory');
  const cfg = loadConfig(process.cwd());
  const options = parseOptions(flags, cfg);
  const outDir = flags.get('--out') as string | undefined;
  const dryRun = flags.has('--dry-run');

  const processFile = async (filePath: string) => {
    const text = fs.readFileSync(filePath, 'utf8');
    const result = runCompression(text, options);
    if (outDir && !dryRun) {
      const rel = path.relative(input, filePath);
      const dest = path.join(outDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, result.output, 'utf8');
    }
    process.stdout.write(`[watch] ${filePath}: ${result.metrics.estimatedTokensBefore}→${result.metrics.estimatedTokensAfter} tokens\n`);
  };

  const { default: chokidar } = await import('chokidar');
  const watcher = chokidar.watch(input, { ignoreInitial: false, persistent: true });
  watcher.on('add', processFile);
  watcher.on('change', processFile);
  process.stdout.write(`[watch] Watching ${input}...\n`);
  await new Promise(() => {});
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  if (args[0] === 'watch') {
    runWatch(args.slice(1)).catch((e) => { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); });
  } else {
    process.exit(runCli(args));
  }
}
