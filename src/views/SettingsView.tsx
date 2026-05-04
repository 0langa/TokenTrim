import type { Theme } from '../hooks/useTheme';
import type { TokenizerKind } from '../compression/types';

const GITHUB_URL = 'https://github.com/0langa/TokenTrim';

function SunIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface Props {
  tokenizer: TokenizerKind;
  setTokenizer: (v: TokenizerKind) => void;
  targetTokens: string;
  setTargetTokens: (v: string) => void;
  allowUnsafeTransforms: boolean;
  setAllowUnsafeTransforms: (v: boolean) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1.5">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm text-slate-800 dark:text-slate-200">{label}</span>
        {hint && <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{hint}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsView({
  tokenizer, setTokenizer, targetTokens, setTargetTokens,
  allowUnsafeTransforms, setAllowUnsafeTransforms,
  theme, onToggleTheme,
}: Props) {
  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-slate-900">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Changes apply immediately to the compress workspace.
          </p>
        </div>

        <Section title="Appearance">
          <Row
            label="Color theme"
            hint="Switch between dark and light interface."
          >
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </Row>
        </Section>

        <Section title="Token Counter">
          <Row
            label="Tokenizer"
            hint="Which token counting method to use. Generic is fast and model-agnostic. OpenAI variants closely approximate GPT-3.5/4 (cl100k) or GPT-4o (o200k)."
          >
            <select
              value={tokenizer}
              onChange={(e) => setTokenizer(e.target.value as TokenizerKind)}
              className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="approx-generic">Generic (~approx)</option>
              <option value="openai-cl100k">OpenAI cl100k (~approx)</option>
              <option value="openai-o200k">OpenAI o200k (~approx)</option>
            </select>
          </Row>
        </Section>

        <Section title="Token Budget">
          <Row
            label="Target token limit"
            hint="When set, the pipeline stretches or squashes compression to hit a specific token count. Leave empty to disable."
          >
            <input
              type="number"
              min={1}
              value={targetTokens}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || /^\d+$/.test(v)) setTargetTokens(v);
              }}
              placeholder="e.g. 4000"
              className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs w-28 placeholder:text-slate-400"
            />
          </Row>
        </Section>

        <Section title="Safety">
          <Row
            label="Allow unsafe transforms"
            hint="Expert mode: apply transforms even when semantic safety checks flag potential meaning loss. Use only when you can review the output manually."
          >
            <input
              type="checkbox"
              checked={allowUnsafeTransforms}
              onChange={(e) => setAllowUnsafeTransforms(e.target.checked)}
              className="w-4 h-4 accent-violet-500"
            />
          </Row>
        </Section>

        <Section title="CLI">
          <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Run TokenTrim from the terminal on files, directories, or stdin:
            </p>
            <code className="block text-xs font-mono text-violet-700 dark:text-violet-300 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded">
              npm install -g tokentrim
            </code>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              View docs on GitHub ↗
            </a>
          </div>
        </Section>

        <Section title="Privacy">
          <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              All compression runs entirely in your browser. No text is uploaded, no accounts are required, and no telemetry is collected.
              Your input is saved to <code className="text-xs font-mono text-slate-500">localStorage</code> for convenience and can be cleared at any time using Reset in the compress workspace.
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
