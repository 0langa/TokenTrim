import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const define = {
  __TOKENTRIM_VERSION__: JSON.stringify(pkg.version),
};

// Bundle CLI
await build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/cli.js',
  define,
});

// Bundle compression library for scripts (benchmark etc.)
await build({
  entryPoints: ['src/compression/pipeline.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/pipeline.js',
  define,
});
