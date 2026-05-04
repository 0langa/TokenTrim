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
      left.push({ text: chunk.text, className: 'text-slate-300' });
      right.push({ text: chunk.text, className: 'text-slate-300' });
    } else if (chunk.op === 'delete') {
      left.push({ text: chunk.text, className: 'text-red-400 line-through bg-red-950/30' });
    } else if (chunk.op === 'insert') {
      right.push({ text: chunk.text, className: 'text-green-400 bg-green-950/30' });
    }
  }

  return (
    <div className="flex h-full overflow-hidden text-sm font-mono">
      <div className="flex-1 overflow-auto p-4 border-r border-slate-700">
        <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Original</div>
        <div className="whitespace-pre-wrap">
          {left.map((item, i) => (
            <span key={i} className={item.className}>{item.text}</span>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Compressed</div>
        <div className="whitespace-pre-wrap">
          {right.map((item, i) => (
            <span key={i} className={item.className}>{item.text}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
