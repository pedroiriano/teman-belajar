import type { DiffLine, DiffResult, DiffSummary } from "@/types/content-versioning";

/**
 * Computes line-by-line diff between two strings using Longest Common Subsequence (LCS).
 * Zero external npm dependencies.
 */
export function computeLineDiff(
  textA: string,
  textB: string,
  baseRevisionNo = 1,
  compareRevisionNo = 2
): DiffResult {
  const linesA = textA.split(/\r?\n/);
  const linesB = textB.split(/\r?\n/);

  const m = linesA.length;
  const n = linesB.length;

  // DP table for LCS length
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (linesA[i] === linesB[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build diff lines
  const rawDiff: Array<{
    type: "added" | "removed" | "unchanged";
    content: string;
    lineAIndex?: number;
    lineBIndex?: number;
  }> = [];

  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      rawDiff.push({
        type: "unchanged",
        content: linesA[i - 1],
        lineAIndex: i,
        lineBIndex: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({
        type: "added",
        content: linesB[j - 1],
        lineBIndex: j,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({
        type: "removed",
        content: linesA[i - 1],
        lineAIndex: i,
      });
      i--;
    }
  }

  rawDiff.reverse();

  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  const lines: DiffLine[] = rawDiff.map((item) => {
    if (item.type === "added") addedCount++;
    else if (item.type === "removed") removedCount++;
    else unchangedCount++;

    return {
      type: item.type,
      leftLineNo: item.lineAIndex,
      rightLineNo: item.lineBIndex,
      content: item.content,
    };
  });

  const summary: DiffSummary = {
    addedCount,
    removedCount,
    unchangedCount,
  };

  return {
    lines,
    summary,
    baseRevisionNo,
    compareRevisionNo,
  };
}

export interface SideBySideRow {
  left?: {
    lineNo?: number;
    content: string;
    type: "removed" | "unchanged" | "empty";
  };
  right?: {
    lineNo?: number;
    content: string;
    type: "added" | "unchanged" | "empty";
  };
}

/**
 * Converts unified DiffLines into paired side-by-side rows.
 */
export function buildSideBySideRows(diffLines: DiffLine[]): SideBySideRow[] {
  const rows: SideBySideRow[] = [];
  let idx = 0;

  while (idx < diffLines.length) {
    const item = diffLines[idx];

    if (item.type === "unchanged") {
      rows.push({
        left: {
          lineNo: item.leftLineNo,
          content: item.content,
          type: "unchanged",
        },
        right: {
          lineNo: item.rightLineNo,
          content: item.content,
          type: "unchanged",
        },
      });
      idx++;
    } else if (item.type === "removed") {
      // Check if followed immediately by added lines to pair them
      const removedGroup: DiffLine[] = [];
      while (idx < diffLines.length && diffLines[idx].type === "removed") {
        removedGroup.push(diffLines[idx]);
        idx++;
      }
      const addedGroup: DiffLine[] = [];
      while (idx < diffLines.length && diffLines[idx].type === "added") {
        addedGroup.push(diffLines[idx]);
        idx++;
      }

      const maxLen = Math.max(removedGroup.length, addedGroup.length);
      for (let k = 0; k < maxLen; k++) {
        const rem = removedGroup[k];
        const add = addedGroup[k];
        rows.push({
          left: rem
            ? { lineNo: rem.leftLineNo, content: rem.content, type: "removed" }
            : { content: "", type: "empty" },
          right: add
            ? { lineNo: add.rightLineNo, content: add.content, type: "added" }
            : { content: "", type: "empty" },
        });
      }
    } else {
      // Added without preceding removed
      rows.push({
        left: { content: "", type: "empty" },
        right: {
          lineNo: item.rightLineNo,
          content: item.content,
          type: "added",
        },
      });
      idx++;
    }
  }

  return rows;
}
