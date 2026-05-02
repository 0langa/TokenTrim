import type { CompressionResult } from '../compression/types';

interface Props {
  result: CompressionResult;
}

type SafetyStatus = 'passed' | 'warnings' | 'review' | 'issues';

function getSafetyStatus(result: CompressionResult): SafetyStatus {
  const errors = result.safetyIssues.filter((i) => i.severity === 'error');
  if (errors.length > 0) return 'issues';
  if (result.rejectedTransforms.length > 0) return 'review';
  const warnings = result.safetyIssues.filter((i) => i.severity === 'warning');
  if (warnings.length > 0) return 'warnings';
  return 'passed';
}

const STATUS_LABEL: Record<SafetyStatus, string> = {
  passed: 'Safety passed',
  warnings: 'Passed with warnings',
  review: 'Review recommended',
  issues: 'Safety issues detected',
};

const STATUS_COLOR: Record<SafetyStatus, string> = {
  passed: 'text-green-400',
  warnings: 'text-yellow-400',
  review: 'text-amber-400',
  issues: 'text-red-400',
};

export function SafetyReviewPanel({ result }: Props) {
  const status = getSafetyStatus(result);
  const errors = result.safetyIssues.filter((i) => i.severity === 'error');
  const warnings = result.safetyIssues.filter((i) => i.severity === 'warning');

  return (
    <div className="p-4 text-xs grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <div className={`text-sm font-semibold mb-1 ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</div>

        {status === 'passed' && (
          <div className="text-slate-400">No critical semantic loss detected.</div>
        )}
        {status === 'warnings' && (
          <div className="text-slate-400">
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''} detected. Review the output before use.
          </div>
        )}
        {status === 'review' && (
          <div className="text-slate-400">
            {result.rejectedTransforms.length} transform{result.rejectedTransforms.length !== 1 ? 's' : ''} rejected
            and not applied to the final output.
            {warnings.length > 0 && ` ${warnings.length} warning${warnings.length !== 1 ? 's' : ''} also detected.`}
          </div>
        )}
        {status === 'issues' && (
          <div className="text-slate-400">
            {errors.length} error{errors.length !== 1 ? 's' : ''} detected.
            {result.rejectedTransforms.length > 0 &&
              ` ${result.rejectedTransforms.length} transform${result.rejectedTransforms.length !== 1 ? 's' : ''} rejected.`}
          </div>
        )}

        <div className="mt-2 space-y-1 text-slate-500">
          <div>Safety issues: {result.safetyIssues.length}</div>
          <div>Rejected transforms: {result.rejectedTransforms.length}</div>
          {result.targetTokens !== undefined && (
            <div>
              Token budget: {result.targetTokens.toLocaleString()} —{' '}
              {result.budgetReached
                ? <span className="text-green-400">reached</span>
                : <span className="text-amber-400">not reached</span>}
            </div>
          )}
          <div title={result.metrics.tokenizerExact ? 'Exact token count' : 'Token counts are approximate estimates'}>
            Token counter: {result.metrics.tokenizerUsed}
            {result.metrics.tokenizerExact
              ? <span className="text-green-400 ml-1">(exact)</span>
              : <span className="text-slate-400 ml-1">(approximate)</span>}
          </div>
        </div>
      </div>

      <div>
        {result.rejectedTransforms.length > 0 && (
          <div className="mb-3">
            <div className="text-slate-300 mb-1">Rejected transforms (not applied to output)</div>
            <div className="space-y-0.5">
              {result.rejectedTransforms.map((id) => (
                <div key={id} className="text-red-400 font-mono">{id}</div>
              ))}
            </div>
          </div>
        )}
        {result.safetyIssues.length > 0 && (
          <div>
            <div className="text-slate-300 mb-1">Safety issues</div>
            <div className="max-h-28 overflow-auto space-y-0.5">
              {result.safetyIssues.map((issue, i) => (
                <div key={i} className={issue.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                  [{issue.severity}] {issue.message}
                </div>
              ))}
            </div>
          </div>
        )}
        {result.rejectedTransforms.length === 0 && result.safetyIssues.length === 0 && (
          <div className="text-slate-500">All transforms passed safety validation.</div>
        )}
      </div>
    </div>
  );
}
