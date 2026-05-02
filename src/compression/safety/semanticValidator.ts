import type { ProtectedSpan, SafetyIssue } from '../types';
import {
  extractCodeIdentifiers,
  extractDates,
  extractNegations,
  extractNumbers,
  extractPaths,
  extractRequirements,
  extractSemvers,
  extractUrls,
} from './extractors';

function diffLoss(before: string[], after: string[]): string[] {
  const afterSet = new Set(after.map((x) => x.toLowerCase()));
  return before.filter((b) => !afterSet.has(b.toLowerCase()));
}

export function validateSemanticSafety(before: string, after: string, spansBefore: ProtectedSpan[], spansAfter: ProtectedSpan[]): SafetyIssue[] {
  const issues: SafetyIssue[] = [];

  const addLosses = (category: SafetyIssue['category'], losses: string[], severity: SafetyIssue['severity'], label: string) => {
    for (const loss of losses.slice(0, 8)) {
      issues.push({ severity, category, before: loss, message: `${label} removed: ${loss}` });
    }
  };

  addLosses('negation-loss', diffLoss(extractNegations(before), extractNegations(after)), 'error', 'Negation');
  addLosses('requirement-loss', diffLoss(extractRequirements(before), extractRequirements(after)), 'error', 'Requirement marker');
  addLosses('number-loss', diffLoss(extractNumbers(before), extractNumbers(after)), 'error', 'Number');
  addLosses('date-loss', diffLoss(extractDates(before), extractDates(after)), 'error', 'Date');
  addLosses('semver-loss', diffLoss(extractSemvers(before), extractSemvers(after)), 'error', 'Semver');
  addLosses('url-loss', diffLoss(extractUrls(before), extractUrls(after)), 'error', 'URL');
  addLosses('path-loss', diffLoss(extractPaths(before), extractPaths(after)), 'error', 'Path');

  const idsBefore = extractCodeIdentifiers(before).filter((x) => x.length > 6);
  const idsAfter = extractCodeIdentifiers(after);
  addLosses('code-identifier-loss', diffLoss(idsBefore, idsAfter), 'warning', 'Code identifier');

  if (spansAfter.length < spansBefore.length) {
    issues.push({ severity: 'error', category: 'protected-span-loss', before: String(spansBefore.length), after: String(spansAfter.length), message: 'Protected span count decreased unexpectedly.' });
  }

  return issues;
}
