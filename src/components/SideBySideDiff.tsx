import type { DiffChunk } from '../lib/wordDiff';

interface Props {
  chunks: DiffChunk[];
}

export function SideBySideDiff({ chunks }: Props) {
  if (chunks.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-500 font-mono">No differences — output identical to input.</div>
    );
  }

  const left: Array<{ text: string; className: string }> = [];
  const right: Array<{ text: string; className: string }> = [];

  for (const chunk of chunks) {
    if (chunk.op === 'equal') {
      left.push({ text: chunk.text, className: 'text-slate-600 dark:text-slate-300' });
      right.push({ text: chunk.text, className: 'text-slate-600 dark:text-slate-300' });
    } else if (chunk.op === 'delete') {
      left.push({ text: chunk.text, className: 'bg-red-100 text-red-700 line-through dark:bg-red-950/30 dark:text-red-400' });
    } else if (chunk.op === 'insert') {
      right.push({ text: chunk.text, className: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' });
    }
  }

  return (
    <div className="flex h-full overflow-hidden text-sm font-mono">
      <div className="flex-1 overflow-auto border-r border-slate-200 p-4 dark:border-slate-700">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Original</div>
        <div className="whitespace-pre-wrap">
          {left.map((item, i) => (
            <span key={i} className={item.className}>{item.text}</span>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Compressed</div>
        <div className="whitespace-pre-wrap">
          {right.map((item, i) => (
            <span key={i} className={item.className}>{item.text}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
