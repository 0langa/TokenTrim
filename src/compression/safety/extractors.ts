export function extractNegations(text: string): string[] {
  const m = text.match(/\b(?:not|never|no|cannot|can't|don't|must not|should not|do not)\b/gi);
  return m ?? [];
}

export function extractRequirements(text: string): string[] {
  return text.match(/\b(?:must|should|shall|required|forbidden|may)\b/gi) ?? [];
}

export function extractNumbers(text: string): string[] {
  return text.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
}

export function extractDates(text: string): string[] {
  return text.match(/\b\d{4}-\d{2}-\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi) ?? [];
}

export function extractSemvers(text: string): string[] {
  return text.match(/\bv?\d+\.\d+\.\d+(?:-[\w.-]+)?\b/g) ?? [];
}

export function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s)\]>"']+/g) ?? [];
}

export function extractPaths(text: string): string[] {
  return text.match(/\b(?:[A-Za-z]:\\[^\s]+|(?:\.\.?\/)?(?:[\w.-]+\/)+[\w.-]+)\b/g) ?? [];
}

export function extractCodeIdentifiers(text: string): string[] {
  return text.match(/\b[A-Za-z_][A-Za-z0-9_]{3,}\b/g) ?? [];
}
