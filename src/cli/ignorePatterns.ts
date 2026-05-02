import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.github', 'coverage',
  '.cache', '.vite', '__pycache__', '.next', '.nuxt', '.svelte-kit',
  '.output', 'vendor', 'tmp', 'temp', '.turbo', '.parcel-cache',
]);

export const DEFAULT_IGNORE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.avif',
  '.zip', '.tar', '.gz', '.tgz', '.bz2', '.7z', '.rar', '.xz',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.wasm',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv', '.webm',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.sketch', '.fig', '.psd', '.ai',
]);

export const DEFAULT_IGNORE_FILES = new Set([
  'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb',
  'composer.lock', 'Gemfile.lock', 'poetry.lock', 'Cargo.lock',
  '.DS_Store', 'Thumbs.db', 'desktop.ini',
]);

export const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.md', '.txt', '.rst',
  '.json', '.jsonc', '.json5',
  '.yaml', '.yml', '.toml',
  '.css', '.scss', '.sass', '.less',
  '.html', '.htm', '.xml', '.svg',
  '.py', '.rb', '.rs', '.go', '.java', '.cs', '.cpp', '.c', '.h', '.hpp',
  '.sh', '.bash', '.zsh', '.fish', '.ps1',
  '.env', '.env.example', '.env.template',
  '.gitignore', '.gitattributes', '.editorconfig', '.prettierrc',
  '.eslintrc', '.eslintignore',
  '.dockerfile', '', // no extension (Makefile, Dockerfile etc)
]);

function parseIgnoreFile(content: string): string[] {
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

/** Simple glob: supports leading * wildcard only (e.g. *.lock, *.png) */
function matchesSimplePattern(name: string, pattern: string): boolean {
  if (pattern.startsWith('*')) {
    return name.endsWith(pattern.slice(1));
  }
  return name === pattern;
}

export function loadIgnorePatterns(cwd: string): string[] {
  const p = path.join(cwd, '.tokentrimignore');
  if (fs.existsSync(p)) {
    try {
      return parseIgnoreFile(fs.readFileSync(p, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

export function shouldIgnore(
  filePath: string,
  ignorePatterns: string[],
  cwd: string,
): boolean {
  const rel = path.relative(cwd, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  const basename = parts[parts.length - 1];
  const ext = path.extname(basename).toLowerCase();

  // Default ignored directories (any path segment)
  for (const part of parts) {
    if (DEFAULT_IGNORE_DIRS.has(part)) return true;
  }

  // Default ignored file names
  if (DEFAULT_IGNORE_FILES.has(basename)) return true;

  // Default ignored extensions
  if (DEFAULT_IGNORE_EXTENSIONS.has(ext)) return true;

  // Custom .tokentrimignore patterns
  for (const pattern of ignorePatterns) {
    if (matchesSimplePattern(basename, pattern)) return true;
    if (matchesSimplePattern(rel, pattern)) return true;
    for (const part of parts) {
      if (matchesSimplePattern(part, pattern)) return true;
    }
  }

  return false;
}

export function isTextFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);
  return TEXT_EXTENSIONS.has(ext) || basename === 'Makefile' || basename === 'Dockerfile';
}

export type WalkResult = {
  included: string[];
  skipped: number;
};

export function walkFilesWithIgnore(
  dir: string,
  ignorePatterns: string[],
  cwd: string,
  seen = new Set<string>(),
): WalkResult {
  const included: string[] = [];
  let skipped = 0;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return { included, skipped };
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    // Resolve real path to detect symlink loops
    let real: string;
    try {
      real = fs.realpathSync(full);
    } catch {
      skipped += 1;
      continue;
    }

    if (seen.has(real)) {
      skipped += 1;
      continue;
    }
    seen.add(real);

    if (shouldIgnore(full, ignorePatterns, cwd)) {
      skipped += 1;
      continue;
    }

    if (entry.isSymbolicLink()) {
      // Only follow symlinks to files, not directories (avoid loops)
      try {
        const stat = fs.statSync(full);
        if (stat.isFile()) {
          included.push(full);
        } else {
          skipped += 1;
        }
      } catch {
        skipped += 1;
      }
    } else if (entry.isDirectory()) {
      const sub = walkFilesWithIgnore(full, ignorePatterns, cwd, seen);
      included.push(...sub.included);
      skipped += sub.skipped;
    } else if (entry.isFile()) {
      included.push(full);
    }
  }

  return { included, skipped };
}
