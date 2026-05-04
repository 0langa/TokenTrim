type DiffOp = { type: 'eq' | 'del' | 'ins'; line: string };

/**
 * Simple greedy line diff. Finds longest common prefix/suffix and recurses.
 * Good enough for text compression diffs where changes are mostly deletions.
 */
function lineDiff(a: string[], b: string[]): DiffOp[] {
  const result: DiffOp[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ type: 'eq', line: a[i] });
      i++;
      j++;
      continue;
    }

    // Search for next match in a and b
    let matchA = -1;
    let matchB = -1;
    const searchLimit = 20; // cap search window for performance

    for (let k = 1; k < searchLimit && i + k < a.length; k++) {
      if (a[i + k] === b[j]) {
        matchA = k;
        break;
      }
    }
    for (let k = 1; k < searchLimit && j + k < b.length; k++) {
      if (a[i] === b[j + k]) {
        matchB = k;
        break;
      }
    }

    if (matchA === -1 && matchB === -1) {
      // No nearby match — treat as replace (delete + insert)
      result.push({ type: 'del', line: a[i] });
      result.push({ type: 'ins', line: b[j] });
      i++;
      j++;
    } else if (matchA === -1 || (matchB !== -1 && matchB < matchA)) {
      // Insertion in b is closer
      for (let k = 0; k < matchB; k++) {
        result.push({ type: 'ins', line: b[j + k] });
      }
      j += matchB;
    } else {
      // Deletion in a is closer
      for (let k = 0; k < matchA; k++) {
        result.push({ type: 'del', line: a[i + k] });
      }
      i += matchA;
    }
  }

  while (i < a.length) {
    result.push({ type: 'del', line: a[i++] });
  }
  while (j < b.length) {
    result.push({ type: 'ins', line: b[j++] });
  }

  return result;
}

function groupIntoHunks(ops: DiffOp[], context: number): Array<{ startA: number; startB: number; lines: DiffOp[] }> {
  const hunks: Array<{ startA: number; startB: number; lines: DiffOp[] }> = [];
  let current: DiffOp[] = [];
  let aIdx = 0;
  let bIdx = 0;
  let hunkStartA = 0;
  let hunkStartB = 0;
  let trailingContext = 0;

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.type === 'eq') {
      if (current.length > 0) {
        trailingContext++;
        current.push(op);
        aIdx++;
        bIdx++;
        if (trailingContext >= context) {
          // Trim excess trailing context
          const trimmed = current.slice(0, current.length - context + trailingContext);
          hunks.push({ startA: hunkStartA, startB: hunkStartB, lines: trimmed });
          current = [];
          trailingContext = 0;
          hunkStartA = aIdx;
          hunkStartB = bIdx;
        }
      } else {
        aIdx++;
        bIdx++;
        hunkStartA = aIdx;
        hunkStartB = bIdx;
      }
    } else {
      if (current.length === 0) {
        // Pull context lines before change
        const start = Math.max(0, i - context);
        for (let k = start; k < i; k++) {
          current.push(ops[k]);
          if (ops[k].type === 'eq') { aIdx++; bIdx++; }
          else if (ops[k].type === 'del') aIdx++;
          else bIdx++;
        }
        hunkStartA = aIdx;
        hunkStartB = bIdx;
      }
      current.push(op);
      trailingContext = 0;
      if (op.type === 'del') aIdx++;
      if (op.type === 'ins') bIdx++;
    }
  }

  if (current.length > 0) {
    hunks.push({ startA: hunkStartA, startB: hunkStartB, lines: current });
  }

  return hunks;
}

export function createUnifiedDiff(
  original: string,
  compressed: string,
  originalLabel = 'original',
  compressedLabel = 'compressed',
  contextLines = 3,
): string {
  if (original === compressed) {
    return `--- ${originalLabel}\n+++ ${compressedLabel}\n\n(no changes)\n`;
  }

  const a = original.split('\n');
  const b = compressed.split('\n');
  const ops = lineDiff(a, b);
  const hunks = groupIntoHunks(ops, contextLines);

  const lines: string[] = [`--- ${originalLabel}`, `+++ ${compressedLabel}`, ''];

  for (const hunk of hunks) {
    let delCount = 0;
    let insCount = 0;
    for (const op of hunk.lines) {
      if (op.type === 'del') delCount++;
      else if (op.type === 'ins') insCount++;
    }
    lines.push(`@@ -${hunk.startA + 1},${delCount} +${hunk.startB + 1},${insCount} @@`);
    for (const op of hunk.lines) {
      const prefix = op.type === 'eq' ? ' ' : op.type === 'del' ? '-' : '+';
      lines.push(`${prefix}${op.line}`);
    }
  }

  return lines.join('\n') + '\n';
}
