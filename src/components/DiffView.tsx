import type { DiffChunk } from '../lib/wordDiff';

interface Props {
  chunks: DiffChunk[];
}

export function DiffView({ chunks }: Props) {
  if (chunks.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-500 font-mono">No differences — output identical to input.</div>
    );
  }

  return (
    <div className="p-4 text-sm font-mono whitespace-pre-wrap overflow-auto h-full">
      {chunks.map((chunk, i) => {
        if (chunk.op === 'equal') {
          return <span key={i} className="text-slate-400">{chunk.text}</span>;
        }
        if (chunk.op === 'delete') {
          return (
            <span key={i} className="text-red-400 line-through bg-red-950/30">
              {chunk.text}
            </span>
          );
        }
        // insert
        return (
          <span key={i} className="text-green-400 bg-green-950/30">
            {chunk.text}
          </span>
        );
      })}
    </div>
  );
}
