# TokenTrim

Compress AI context locally — deterministic transforms, protected spans, semantic safety validation. No upload. No AI. No telemetry.

## Quick Start

1. Open web app → pick **preset** (Prompt, Logs, Repo, Docs, Chat, Generic)
2. Paste text or drop files
3. Review Output · Diff · Safety · Transforms · Report tabs
4. Copy or download

## How It Works

Protected spans (code, URLs, paths, numbers, JSON/YAML, tables) extracted before transforms run and restored after. Each transform safety-validated; outputs that cause negation loss, number loss, URL loss, or other semantic issues are **rejected and not applied**. See **Reference** tab in app for per-transform details and examples.

## API

```ts
import { compress, optimizeToBudget, estimateTokens, createCompressionReport } from 'tokentrim';

compress(text, { mode, profile, tokenizer, targetTokens, maxRisk, enabledTransforms });
optimizeToBudget(text, options);   // escalates strength until output fits budget
estimateTokens(text, tokenizer);
createCompressionReport(result);   // structured JSON export
```

**Modes:** `light` · `normal` · `heavy` · `ultra` · `custom`  
**Profiles:** `general` · `agent-context` · `repo-context` · `logs` · `markdown-docs` · `chat-history`  
**Tokenizers:** `approx-generic` · `openai-cl100k` · `openai-o200k` — all approximate (`~`)

## CLI

```bash
npm install -g tokentrim

tokentrim compress file.md --mode heavy --profile agent-context --out file.trim.md
tokentrim compress file.md --target-tokens 8000 --out file.trim.md
tokentrim batch ./docs --recursive --out ./trimmed --profile markdown-docs
tokentrim repo ./ --out repo-context.trim.md
tokentrim report file.md --mode normal --out report.json
cat file.md | tokentrim stdin --mode normal
tokentrim init                # write starter config
tokentrim list-transforms     # discovery
```

**Key flags:**

| Flag | Values |
|---|---|
| `--mode` | `light\|normal\|heavy\|ultra\|custom` |
| `--profile` | `general\|agent-context\|repo-context\|logs\|markdown-docs\|chat-history` |
| `--max-risk` | `safe\|low\|medium\|high` |
| `--tokenizer` | `approx-generic\|openai-cl100k\|openai-o200k` |
| `--target-tokens <n>` | stop when output under this count |
| `--out <path>` | output file or directory |
| `--report` | write `.report.json` alongside output |
| `--dry-run` | simulate without writing |

## Config (`.tokentrimrc.json`)

```json
{
  "mode": "heavy",
  "profile": "agent-context",
  "maxRisk": "medium",
  "targetTokens": 12000
}
```

Also accepted: `.tokentrimrc`, `tokentrim.config.json`. CLI flags override config. Run `tokentrim init` to scaffold.

## Ignore File (`.tokentrimignore`)

gitignore-style patterns applied to `batch --recursive` and `repo` commands.

```
generated/
*.min.js
large-dataset.json
```

Default ignored: `node_modules`, `dist`, `build`, `.git`, lockfiles, binary extensions.

## Development

```bash
npm install
npm run dev        # Vite dev server :5173
npm run build      # TypeScript + Vite + CLI
npm run test       # Vitest
npm run benchmark  # requires build
```

## Benchmarks

```bash
npm run build && npm run benchmark
npm run benchmark -- --format json
```

See `benchmarks/README.md` for fixture descriptions.
