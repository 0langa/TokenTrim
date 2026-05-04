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

function diffLoss(before: string[], after: string[], normalizer?: (s: string) => string): string[] {
  const afterSet = new Set(after.map((x) => (normalizer ? normalizer(x) : x.toLowerCase())));
  return before.filter((b) => !afterSet.has(normalizer ? normalizer(b) : b.toLowerCase()));
}

const NEGATION_NORMALIZE: Record<string, string> = {
  'do not': "don't",
  'does not': "doesn't",
  'did not': "didn't",
  'cannot': "can't",
  'will not': "won't",
  'would not': "wouldn't",
  'should not': "shouldn't",
  'could not': "couldn't",
  'might not': "mightn't",
  'must not': "mustn't",
  'is not': "isn't",
  'are not': "aren't",
  'was not': "wasn't",
  'were not': "weren't",
  'has not': "hasn't",
  'have not': "haven't",
  'had not': "hadn't",
  'it is': "it's",
  'that is': "that's",
  'there is': "there's",
};

function normalizeNegation(neg: string): string {
  return NEGATION_NORMALIZE[neg.toLowerCase()] ?? neg.toLowerCase();
}

export interface SafetyConfig {
  protectPatterns?: string[];
  requiredPhrases?: string[];
}

export function validateSemanticSafety(
  before: string,
  after: string,
  spansBefore: ProtectedSpan[],
  spansAfter: ProtectedSpan[],
  config?: SafetyConfig,
): SafetyIssue[] {
  const issues: SafetyIssue[] = [];

  const addLosses = (category: SafetyIssue['category'], losses: string[], severity: SafetyIssue['severity'], label: string) => {
    for (const loss of losses.slice(0, 8)) {
      issues.push({ severity, category, before: loss, message: `${label} removed: ${loss}` });
    }
  };

  addLosses('negation-loss', diffLoss(extractNegations(before), extractNegations(after), normalizeNegation), 'error', 'Negation');
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

  if (config?.requiredPhrases) {
    for (const phrase of config.requiredPhrases) {
      if (before.includes(phrase) && !after.includes(phrase)) {
        issues.push({ severity: 'error', category: 'requirement-loss', before: phrase, message: `Required phrase removed: ${phrase}` });
      }
    }
  }

  if (config?.protectPatterns) {
    for (const pattern of config.protectPatterns) {
      try {
        const regex = new RegExp(pattern, 'gi');
        const beforeMatches = before.match(regex) ?? [];
        const afterMatches = after.match(regex) ?? [];
        const lost = diffLoss(beforeMatches, afterMatches);
        for (const loss of lost.slice(0, 8)) {
          issues.push({ severity: 'error', category: 'protected-span-loss', before: loss, message: `Protected pattern match removed: ${loss}` });
        }
      } catch {
        issues.push({ severity: 'warning', category: 'protected-span-loss', before: pattern, message: `Invalid protectPattern: ${pattern}` });
      }
    }
  }

  return issues;
}
