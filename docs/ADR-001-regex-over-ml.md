# ADR-001: Regex-Based Transforms Over ML Models

## Status
Accepted

## Context
TokenTrim needs to compress text for LLM context windows. Two approaches were considered:
1. **ML-based compression** (e.g., LLMLingua-style token dropping with small language models)
2. **Regex/rule-based transforms** (pattern matching and replacement)

## Decision
We chose regex/rule-based transforms.

## Rationale

### 1. Browser-First Constraint
TokenTrim runs entirely in the browser. Loading a 100MB+ transformer model for compression defeats the purpose of a lightweight utility. Regex transforms are <50 KB of code and run in milliseconds.

### 2. Determinism
ML compression is stochastic — the same input may yield different outputs. Regex transforms are deterministic, making testing, debugging, and safety validation tractable.

### 3. Explainability
Each regex rule has a clear before/after pattern. Users can inspect `transformRegistry.ts` and understand exactly what changed. ML-based compression is a black box.

### 4. Safety
Our safety validator compares semantic tokens (requirements, negations, numbers) before and after compression. With regex rules, we know exactly which patterns might affect which semantic categories. ML models could silently drop critical information.

### 5. No External Dependencies
Regex requires zero runtime dependencies. ML would require `transformers.js`, ONNX Runtime, or WASM binaries — adding megabytes to the bundle and complicating the build.

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| Regex | Fast, deterministic, small, safe | Less nuanced than ML; cannot paraphrase creatively |
| ML | Better semantic preservation | Slow, large, stochastic, opaque, requires model weights |

## Consequences
- Compression quality is bounded by rule coverage. We mitigate this by expanding rule packs (50+ rules per transform).
- We will NOT adopt ML-based compression as the primary mechanism.
