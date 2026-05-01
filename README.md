# TokenTrim

TokenTrim is a local-first web app for shrinking AI-agent context safely.

It runs entirely in-browser (plus optional local CLI), with no telemetry and no AI calls.

## v1 Focus

- Safe-by-default compression that still gives noticeable token reduction
- Clear separation between reversible and lossy modes
- Practical reporting so users can verify what changed before using output

## Guarantees

- Reversible profiles (`lossless-light`, `lossless-dict`) validate normalized roundtrip.
- Lossy profiles are always labeled one-way and risk-scored.
- Protected spans are never transformed.
- If reversible validation fails, TokenTrim fails closed and returns original input.

Normalization baseline: line ending normalization, trailing whitespace cleanup, blank-line compaction, and multi-space cleanup.

## Profiles

| Profile | Reversible | Risk | Guidance | Expected token savings |
|---|---:|---|---|---:|
| `lossless-light` | yes | safe | Best for prompts requiring safe normalization | 4-12% |
| `lossless-dict` | yes | low | Repetitive context; requires legend | 8-22% |
| `docs-readme` | no | low | Best for docs/README | 8-20% |
| `codebase-context` | no | medium | Best for engineering context | 10-24% |
| `meeting-notes` | no | medium | Best for dense meeting notes | 12-26% |
| `lossy-prose` | no | medium | General text simplification | 12-28% |
| `lossy-agent` | no | high | Advanced aggressive shortening | 20-40% |
| `research-notes` | no | low | Conservative citation-aware notes | 6-16% |
| `spec` | no | low | Conservative requirements text | 5-14% |
| `chat-history` | no | medium | Long conversation compression | 12-30% |

## Protected Spans

Transforms do not run inside:

- fenced code / inline code
- URLs / file paths / CLI commands
- env vars / API-like placeholders
- numbers+units
- JSON / YAML / TOML fenced blocks
- Markdown tables / headings
- emails / quoted strings

## Browser Usage

1. Pick a profile (default: `lossless-light`).
2. Paste text or load a sample/file.
3. Review metrics + “What Changed” report + diff preview.
4. Copy or download output (and legend when applicable).

Batch mode supports `.txt`, `.md`, `.json`, `.yaml`, `.yml`, `.toml`, `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.css`, `.html`.

## Decode / Restore

Decode/Restore supports reversible outputs with a valid legend JSON.
Lossy outputs are explicitly one-way and will not be presented as restorable.

## API

```ts
compress(text, options)
decompress(text, legend)
estimateTokens(text, tokenizer)
listProfiles()
```

Stable result fields for v1 UI/API consumers include:
- `reversible`
- `validation.validationKind`
- `warnings`
- `report.riskEvents`
- `metrics.netCharSavingsIncludingLegend`

## CLI (beta local helper)

```bash
tokentrim compress file.md --profile docs-readme
tokentrim compress file.md --profile lossless-dict --out file.trim.md --legend file.legend.json
tokentrim decompress file.trim.md --legend file.legend.json
tokentrim batch ./docs --profile codebase-context
```

## Token Estimate Caveat

Current tokenizer mode is `approx-generic`; token counts are estimates, not exact model-token counts.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

## Deployment

- GitHub Pages workflow enforces lint/typecheck/test/build before deploy.
- `dist/404.html` is generated for SPA fallback.
- `netlify.toml` included for optional Netlify deployment with cache headers and SPA redirect.

## Roadmap

- Optional exact GPT-compatible tokenizer package integration
- Custom rule editor/import-export
- Batch zip export
- Larger virtualized diff UI
