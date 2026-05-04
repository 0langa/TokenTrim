import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const define = {
  __TOKENTRIM_VERSION__: JSON.stringify(pkg.version),
};

// Bundle library entry point for npm consumers
await build({
  entryPoints: ['src/compression/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  define,
  external: [],
});

console.log('Built dist/index.js');
