export function extractNegations(text: string): string[] {
  const m = text.match(
    /\b(?:not|never|no|cannot|can't|don't|must not|should not|do not|doesn't|didn't|won't|wouldn't|couldn't|mightn't|mustn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't)\b/gi,
  );
  return m ?? [];
}

export function extractRequirements(text: string): string[] {
  // Match requirement words even inside contractions (mustn't → must) without consuming the suffix
  return text.match(/\b(?:must|should|shall|required|forbidden|may)(?=n't|\b)/gi) ?? [];
}

export function extractNumbers(text: string): string[] {
  // Match digits even when followed by letters (e.g. 200ms → 200)
  return text.match(/\b\d+(?:\.\d+)?(?=\b|[^0-9])/g) ?? [];
}

export function extractDates(text: string): string[] {
  return (
    text.match(
      /\b\d{4}-\d{2}-\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    ) ?? []
  );
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
