interface Props {
  charCount: number;
  onCompressAnyway: () => void;
  onCancel?: () => void;
}

const ONE_MB = 1_000_000;

export function LargeFileWarning({ charCount, onCompressAnyway, onCancel }: Props) {
  if (charCount < ONE_MB) return null;

  const mb = (charCount / ONE_MB).toFixed(1);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-100">Large input detected</h3>
        </div>
        <p className="text-xs text-slate-300 mb-4">
          This input is <strong>{mb} MB</strong> ({charCount.toLocaleString()} chars). Compression may take
          several seconds and use more browser memory than usual.
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onCompressAnyway}
            className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded transition-colors"
          >
            Compress anyway
          </button>
        </div>
      </div>
    </div>
  );
}
