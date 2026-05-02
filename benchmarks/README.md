# TokenTrim Benchmarks

Benchmark suite for measuring compression quality, safety, and performance.

## Running

```bash
npm run benchmark
# or with JSON output:
npm run benchmark -- --format json
```

Requires `npm run build` first (benchmark imports from `dist/pipeline.js`).

## Fixtures

| File | Profile | Description |
|---|---|---|
| `agent-context.md` | agent-context | AI agent system prompt with instructions |
| `markdown-doc.md` | markdown-docs | API documentation with tables and code |
| `build-log.txt` | logs | CI/CD build log with repeated lines |
| `chat-history.md` | chat-history | Engineering meeting transcript |
| `repo-context.md` | repo-context | Source code context pack |

## Output columns

- **fixture** — fixture filename
- **mode** — compression mode
- **profile** — use-case profile
- **chars in/out** — character counts before and after
- **tokens in/out** — approximate token counts
- **char%** — character savings percentage
- **tok%** — token savings percentage
- **ms** — compression duration in milliseconds
- **issues** — safety issue count
- **rejected** — rejected transform count

## Notes

- Token counts are approximate (no exact tokenizer is bundled).
- Benchmark measures wall-clock time per compression call.
- Safety issues and rejected transforms indicate semantic safety activity, not failures.
- Fixtures are kept small to stay within the repo. For larger-scale benchmarks, use your own files.
