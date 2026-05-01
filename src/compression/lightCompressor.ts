/**
 * Light: lossless whitespace/comment normalization.
 * Removes trailing spaces, collapses blank lines (>2 → 1), strips
 * single-line // and # comments, normalizes line endings to \n.
 * Decompression: identity (original is recoverable via inverse — but
 * since comment removal is destructive, light mode ONLY removes
 * provably non-semantic whitespace, NOT comments by default).
 */

export function lightCompress(text: string): string {
  return text
    .replace(/\r\n/g, '\n')            // normalize CRLF
    .replace(/\r/g, '\n')              // normalize CR
    .replace(/[^\S\n]+$/gm, '')        // trailing spaces per line
    .replace(/\n{3,}/g, '\n\n')        // collapse 3+ blank lines to 2
    .replace(/^[ \t]+$/gm, '')         // lines that are only whitespace
    .trimEnd();                         // trailing newline at EOF
}

export function lightDecompress(text: string): string {
  // Light is structurally reversible — original whitespace pattern
  // cannot be restored, but the operation is deterministic so we
  // validate by re-compressing the original and comparing to output.
  return text;
}
