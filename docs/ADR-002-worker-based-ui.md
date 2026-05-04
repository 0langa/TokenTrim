# ADR-002: Web Worker for Compression

## Status
Accepted

## Context
The web UI compresses text on every keystroke (debounced 300ms). Compression can take 50–200ms on large inputs. Running this on the main thread would freeze the input textarea and make the UI unresponsive.

## Decision
Compression runs in a dedicated Web Worker (`src/workers/compressionWorker.ts`).

## Rationale

### 1. Main Thread Responsiveness
The input textarea, drag-and-drop, and all controls remain interactive even during heavy compression. The worker handles all regex replacement, safety validation, and token counting.

### 2. Exact Tokenizer Loading
The `gpt-tokenizer` exact encoder is ~2MB of JSON. Loading it in the worker keeps it off the main thread. The worker preloads the encoder on startup and caches it for subsequent compressions.

### 3. Shared Nothing Architecture
The worker receives a message with `{ text, options }` and returns `{ result }`. No shared state means no race conditions or complex synchronization.

### 4. Easy to Test
The worker logic is just a thin wrapper around `compress()`. Unit tests call `compress()` directly; the worker is tested via integration tests in `CompressView.test.tsx`.

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| Worker | Non-blocking, isolated, preloadable | Message passing overhead (~1ms), harder to debug |
| Main thread | Simpler, shared memory | Blocks UI on large inputs |

## Consequences
- We must serialize/deserialize the `CompressionResult` across the worker boundary. This is cheap (<1ms) for typical inputs.
- Stack traces from worker errors are less readable. We wrap worker errors with contextual messages.
