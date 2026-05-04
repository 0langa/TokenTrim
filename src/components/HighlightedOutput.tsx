import { useEffect, useState } from 'react';
import type { HighlighterCore } from 'shiki';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import js from 'shiki/langs/javascript.mjs';
import ts from 'shiki/langs/typescript.mjs';
import json from 'shiki/langs/json.mjs';
import yaml from 'shiki/langs/yaml.mjs';
import markdown from 'shiki/langs/markdown.mjs';
import python from 'shiki/langs/python.mjs';
import bash from 'shiki/langs/bash.mjs';
import css from 'shiki/langs/css.mjs';
import html from 'shiki/langs/html.mjs';
import rust from 'shiki/langs/rust.mjs';
import go from 'shiki/langs/go.mjs';
import java from 'shiki/langs/java.mjs';
import xml from 'shiki/langs/xml.mjs';
import vitesseDark from 'shiki/themes/vitesse-dark.mjs';
import vitesseLight from 'shiki/themes/vitesse-light.mjs';


let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [vitesseDark, vitesseLight],
      langs: [js, ts, json, yaml, markdown, python, bash, css, html, rust, go, java, xml],
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
