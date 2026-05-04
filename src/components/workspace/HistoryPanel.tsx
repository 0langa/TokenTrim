import type { HistoryEntry } from '../../hooks/useCompressionHistory';
import type { CompressionMode } from '../../compression/types';

interface Props {
  history: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

const MODE_COLORS: Record<CompressionMode, string> = {
  light: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  normal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  heavy: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ultra: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  custom: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupByDate(entries: HistoryEntry[]): Array<{ date: string; items: HistoryEntry[] }> {
  const groups = new Map<string, HistoryEntry[]>();
  for (const e of entries) {
    const key = formatDate(e.timestamp);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
}

export function HistoryPanel({ history, onRestore, onRemove, onClear, onClose }: Props) {
  const groups = groupByDate(history);
  const hasItems = history.length > 0;

  return (
    <aside className="w-72 shrink-0 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
      <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-slate-200 dark:border-slate-700">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">History</span>
        <div className="flex items-center gap-1">
          {hasItems && (
            <button
              onClick={onClear}
              className="text-[10px] px-2 py-1 rounded text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasItems && (
          <div className="p-4 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">No history yet.</p>
            <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">
              Compress text and click &quot;Save&quot; in the metrics bar to add entries.
            </p>
          </div>
        )}

        {groups.map(({ date, items }) => (
          <div key={date}>
            <div className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 backdrop-blur px-3 py-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {date}
            </div>
            {items.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onRestore(entry)}
                className="w-full text-left px-3 py-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${MODE_COLORS[entry.mode]}`}>
                    {entry.mode}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{entry.profile}</span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600 ml-auto">{formatTime(entry.timestamp)}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); onRemove(entry.id); }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-opacity cursor-pointer px-1"
                    title="Remove"
                  >
                    ×
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate mb-0.5" title={entry.inputPreview}>
                  {entry.inputPreview}
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-400 dark:text-slate-500">
                    {entry.metrics.originalChars.toLocaleString()} → {entry.metrics.outputChars.toLocaleString()} chars
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">
                    ~{entry.metrics.estimatedTokenSavings} tok saved
                  </span>
                  {entry.safetyIssueCount > 0 && (
                    <span className="text-red-500 dark:text-red-400" title={`${entry.safetyIssueCount} safety issues`}>⚠</span>
                  )}
                  {entry.rejectedCount > 0 && (
                    <span className="text-amber-500 dark:text-amber-400" title={`${entry.rejectedCount} transforms rejected`}>⊘</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
