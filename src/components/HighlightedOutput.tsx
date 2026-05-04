import { useEffect, useState } from 'react';
import type { HighlighterCore } from 'shiki';

let highlighterPromise: Promise<HighlighterCore> | null = null;

async function getHighlighter() {
  if (!highlighterPromise) {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, js, ts, json, yaml, markdown, python, bash, css, html, rust, go, java, xml, vitesseDark, vitesseLight] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('shiki/langs/javascript.mjs'),
      import('shiki/langs/typescript.mjs'),
      import('shiki/langs/json.mjs'),
      import('shiki/langs/yaml.mjs'),
      import('shiki/langs/markdown.mjs'),
      import('shiki/langs/python.mjs'),
      import('shiki/langs/bash.mjs'),
      import('shiki/langs/css.mjs'),
      import('shiki/langs/html.mjs'),
      import('shiki/langs/rust.mjs'),
      import('shiki/langs/go.mjs'),
      import('shiki/langs/java.mjs'),
      import('shiki/langs/xml.mjs'),
      import('shiki/themes/vitesse-dark.mjs'),
      import('shiki/themes/vitesse-light.mjs'),
    ]);
    highlighterPromise = createHighlighterCore({
      themes: [vitesseDark.default ?? vitesseDark, vitesseLight.default ?? vitesseLight],
      langs: [
        js.default ?? js, ts.default ?? ts, json.default ?? json, yaml.default ?? yaml,
        markdown.default ?? markdown, python.default ?? python, bash.default ?? bash,
        css.default ?? css, html.default ?? html, rust.default ?? rust, go.default ?? go,
        java.default ?? java, xml.default ?? xml,
      ],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

interface Props {
  text: string;
  dark?: boolean;
}

export function HighlightedOutput({ text, dark = true }: Props) {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      const theme = dark ? 'vitesse-dark' : 'vitesse-light';
      const parts = text.split(/(```[\s\S]*?```)/g);
      const out: string[] = [];
      for (const part of parts) {
        if (part.startsWith('```')) {
          const match = part.match(/^```(\w+)?\n([\s\S]*?)```$/);
          if (match) {
            const lang = match[1] ?? 'text';
            const code = match[2];
            try {
              const highlighted = highlighter.codeToHtml(code, { lang, theme });
              out.push(highlighted);
            } catch {
              out.push(`<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`);
            }
          } else {
            out.push(`<pre class="shiki"><code>${escapeHtml(part)}</code></pre>`);
          }
        } else {
          out.push(`<span class="whitespace-pre-wrap">${escapeHtml(part)}</span>`);
        }
      }
      setHtml(out.join(''));
    });
    return () => { cancelled = true; };
  }, [text, dark]);

  return (
    <div
      className="text-sm font-mono whitespace-pre-wrap flex-1"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
