# DEPLOYMENT

## Target

- Host: GitHub Pages only
- Site type: static project site
- Public URL: `https://0langa.github.io/TokenTrim/`

## Static Constraints

- No server runtime
- No API routes
- No SSR assumptions
- No backend persistence
- All state must live in browser memory, URL, cache, or `localStorage`

## Required Build Behavior

- `vite.config.ts` derives `base` from `package.json.homepage`
- `npm run build:pages` must emit:
  - `dist/index.html`
  - `dist/404.html`
  - `dist/.nojekyll`
- Secondary views should stay lazy-loaded so first paint does not pay for WebLLM/reference/compare code upfront

## Release Flow

1. Update code/docs/changelog.
2. Run:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build:pages
   ```
3. Push `main`.
4. GitHub Actions workflow `.github/workflows/deploy.yml` verifies and deploys.

## Failure Checklist

- Broken assets under `/TokenTrim/`: check `package.json.homepage` and Vite `base`
- Deep-link refresh broken: check `dist/404.html`
- Missing static assets on Pages: check `dist/.nojekyll`
- Heavy first load: check `src/App.tsx` lazy imports and large build chunks
- LLM failures on site only: verify browser WebGPU support, not Pages config
