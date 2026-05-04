# NEXT STEPS

## Short Term

- Add browser integration tests for worker-state races, Pages deep-link refresh, and LLM view model switching.
- Add explicit UI status for chunked LLM compression: chunk count, active chunk, merge pass.
- Cap or offload large history payloads instead of storing full outputs in `localStorage`.
- Add copy/export actions to `LLM Compress`.
- Add exact user-facing messaging when WebLLM model download/cache fails.
- Add per-view smoke tests for URL restore, reset, privacy behavior, and lazy-view loading.

## Long Term

- Add optional ONNX/WebAssembly fallback for non-WebGPU browsers.
- Add chunk-aware structured outputs for long docs: outline, bullets, spec, incident-summary.
- Add cancelable deterministic worker jobs, not only stale-response suppression.
- Add benchmark coverage for browser worker latency and memory, not only compression ratios.
- Add plugin-style transform packs or user-defined transform bundles.
- Add visual regression checks for key Pages views across mobile + desktop widths.
