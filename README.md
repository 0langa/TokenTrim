# TokenTrim

TokenTrim is a local-first web app for shrinking AI-agent context.

It runs fully in-browser (plus optional local CLI), with no telemetry and no AI calls.

## v1.1 Direction

TokenTrim now uses exactly four one-way compression modes:
- `Light`
- `Normal`
- `Heavy`
- `Ultra`

No decode/restore path in mainline UX. If output quality is not suitable, keep the original input.

## Modes

| Mode | Style | Risk | Expected token savings |
|---|---|---|---|
| Light | Safe structural + minimal rewrite | safe | 8-18% |
| Normal | Balanced concise rewrite | low | 18-32% |
| Heavy | Aggressive syntax compression | medium | 30-45% |
| Ultra | Max caveman-style telegraphic | high | 35-55% |

## Protected spans

Transforms never run inside protected spans:
- code blocks / inline code
- URLs / paths / CLI commands
- env vars / API-like keys
- numbers+units
- fenced JSON/YAML/TOML
- markdown tables/headings
- emails / quoted strings

## Browser usage

1. Select mode (`Light/Normal/Heavy/Ultra`).
2. Paste text or upload files.
3. Review token/char savings and rewrite report.
4. Download output as `.txt`, `.md`, or `.json`.

Batch mode supports:
`.txt`, `.md`, `.json`, `.yaml`, `.yml`, `.toml`, `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.css`, `.html`.

## API

```ts
compress(text, { mode, tokenizer })
estimateTokens(text, tokenizer)
listModes()
```

## CLI

```bash
tokentrim compress file.md --mode heavy
tokentrim batch ./docs --mode ultra
```

Compatibility shim for one release cycle:
- `--profile` is accepted and mapped to one of the four modes with a warning.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```
