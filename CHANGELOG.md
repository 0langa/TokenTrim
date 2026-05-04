# Changelog

## 2.1.0 - 2026-05-04

### Fixed

- `LLM Compress` no longer aborts itself during normal React state transitions.
- Selected LLM model and loaded LLM model are now kept explicit; switching models requires reload instead of silently using old weights.
- Long LLM input now plans around model context limits and falls back to local chunk + merge compression.
- Deterministic worker hooks now ignore stale responses instead of letting old jobs overwrite newer input.
- Large-file acknowledgement now resets correctly when input changes.
- Custom transform reset now restores the real saved baseline instead of leaving stale selections behind.

### Improved

- Main workspace input persistence is now debounced to reduce synchronous `localStorage` churn.
- Main web UI removed presets, simplified mode/profile selection, and added friendlier recommendations for non-technical users.
- Batch compression now runs through the worker path instead of repeatedly using the main thread.
- Secondary app views are lazy-loaded to reduce initial GitHub Pages load cost.
- Pages build now emits `404.html` and `.nojekyll`, and Vite base path is derived from the GitHub Pages homepage URL.
- Package/docs privacy copy now reflects optional local WebLLM support without implying text upload.

### Docs

- Added `README.md`.
- Added `docs/CODEMAP.md`.
- Added `docs/DEPLOYMENT.md`.
- Added `docs/NEXT-STEPS.md`.
- Updated docs to reflect GitHub Pages as the only deployment target.
