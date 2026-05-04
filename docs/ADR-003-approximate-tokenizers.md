# ADR-003: Approximate Tokenizers by Default

## Status
Accepted

## Context
Token counting is critical for the budget optimizer and metrics display. We support three tokenizers:
1. `approx-generic` — characters / 4 (fast, no deps)
2. `openai-cl100k` — exact via `gpt-tokenizer` (slow on first load, ~2MB)
3. `openai-o200k` — exact via `gpt-tokenizer` (slow on first load, ~2MB)

## Decision
`approx-generic` is the default. Exact tokenizers are opt-in.

## Rationale

### 1. Bundle Size
The exact encoders add ~2MB to the bundle. For a tool that may be loaded over slow connections, this is unacceptable as a default.

### 2. Speed
Approximate token counting is O(1) — just `Math.ceil(chars / 4)`. Exact tokenization is O(n) and requires BPE merges.

### 3. Good Enough
For compression workflows, approximate counts are sufficient. Users care about relative savings ("saved 30% tokens") more than exact counts. The budget optimizer works fine with approximate estimates.

### 4. Exact When Needed
Users who need exact counts for specific models (e.g., "must fit in GPT-4's 128k context") can select the exact tokenizer. The UI shows `~` prefix for approximate counts and strips it for exact counts.

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| Approx default | Fast, small, good enough | ±10% error vs. exact |
| Exact default | Precise | Slow, large bundle |

## Consequences
- MetricsBar shows `~` before approximate token counts.
- Budget optimizer uses approximate counts by default but respects exact when selected.
- We document the approximation method (`chars / 4`) so users understand the heuristic.
