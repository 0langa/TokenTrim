interface Props {
  value: string;
  onChange: (v: string) => void;
}

const PLACEHOLDER = `Paste text to compress…

Supports prompts, logs, markdown, code, YAML, JSON, and plain text.
Pick a preset above, or tune compression strength and options below.`;

export function InputPanel({ value, onChange }: Props) {
  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Input</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDER}
        className="flex-1 p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-mono resize-none outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
        spellCheck={false}
      />
      {!value && (
        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-1.5 text-[11px] text-slate-400 dark:text-slate-600 shrink-0 bg-white dark:bg-slate-900">
          Drag &amp; drop files · supports text, markdown, code, logs, JSON, YAML
        </div>
      )}
    </div>
  );
}
