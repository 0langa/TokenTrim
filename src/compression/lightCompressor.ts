export function lightCompress(text: string): string {
  return text
    .replace(/\r\n/g, '\n')                          // normalize CRLF
    .replace(/\r/g, '\n')                             // normalize CR
    .replace(/[^\S\n]+$/gm, '')                       // trailing spaces per line
    .replace(/^[ \t]+$/gm, '')                        // whitespace-only lines → empty
    .replace(/\n{3,}/g, '\n\n')                       // collapse 3+ blank lines to 2
    .replace(/(?<=\S) {2,}/g, ' ')                    // collapse mid-line multi-spaces
    .replace(/^#{1,6} /gm, '')                        // strip markdown heading markers
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')       // strip bold/italic (* markers)
    .replace(/_{1,3}([^_\n]+)_{1,3}/g, '$1')         // strip bold/italic (_ markers)
    .replace(/^> ?/gm, '')                            // strip blockquote markers
    .replace(/^[-*_]{3,}\s*$/gm, '')                  // remove horizontal rules
    .replace(/\n{3,}/g, '\n\n')                       // re-collapse blanks (markdown removal can add extras)
    .trimEnd();
}

export function lightDecompress(text: string): string {
  return text;
}
