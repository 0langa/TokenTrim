# Contributing to TokenTrim

Thanks for your interest! This guide covers how to add transforms, write tests, and update benchmarks.

## Development Setup

```bash
npm install
npm run dev      # Vite dev server
npm test         # Vitest watch mode
npm run build    # Full build (types + vite + lib + cli)
```

## Project Structure

```
src/
  compression/
    transforms/       # All text transforms
    safety/         # Semantic validation
    pipeline.ts     # Main compress() API
  cli/              # CLI entry point and helpers
  components/       # React UI components
  views/            # Top-level page views
  hooks/            # React hooks
  workers/          # Web workers
```

## Adding a New Transform

1. **Create the transform file** in `src/compression/transforms/myTransform.ts`:

```ts
import { applyRules } from './shared';

const RULES = [
  { pattern: /\butilize\b/gi, replacement: 'use' },
];

export function myTransform(input: string) {
  return applyRules(input, 'my-transform', 'low', RULES);
}
```

2. **Register it** in `src/compression/transformRegistry.ts`:

```ts
import { myTransform } from './transforms/myTransform';

export const TRANSFORM_REGISTRY: TokenTrimTransform[] = [
  // ... existing transforms
  { id: 'my-transform', label: 'My Transform', risk: 'low', defaultModes: ['normal', 'heavy', 'ultra'], apply: myTransform },
];
```

3. **Add a test** in `src/compression/transforms/myTransform.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { myTransform } from './myTransform';

describe('myTransform', () => {
  it('replaces utilize with use', () => {
    const { output } = myTransform('We utilize this tool');
    expect(output).toBe('We use this tool');
  });
});
```

4. **Set risk appropriately:**
   - `safe` — structural changes only (whitespace, markdown cleanup)
   - `low` — substitutions with identical meaning (abbreviations, contractions)
   - `medium` — rewrites that may change tone (prose rewrite, filler removal)
   - `high` — aggressive changes that may affect readability (caveman compaction, article removal)

## Safety Validator

All transforms with risk ≥ `medium` are validated by `semanticValidator.ts`. It checks for:
- Negation loss (`not`, `never`, `cannot`)
- Requirement loss (`must`, `should`, `shall`)
- Number loss (digits, dates, semver)
- Protected span loss (code blocks, URLs, file paths)

If your transform removes words, make sure the safety validator's extractors can still find them in the output. See `src/compression/safety/extractors.ts`.

## Updating Benchmarks

After changing transforms, run:

```bash
npx tsx scripts/benchmark.mjs
```

If savings percentages change by >2%, update the expected ranges in the benchmark README and consider whether the change is intentional.

## Code Style

- TypeScript strict mode, ESM only
- Use `const` and arrow functions where possible
- Prefix private functions with `_` only when truly internal
- Keep regex patterns in `RULES` arrays, not inline

## Pull Request Checklist

- [ ] Tests pass (`npm test`)
- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] New transforms have tests
- [ ] Risk level is appropriate
- [ ] Benchmarks reviewed if savings changed
