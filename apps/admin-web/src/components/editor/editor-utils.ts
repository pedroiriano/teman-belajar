/**
 * Zero-dependency Markdown editor text-manipulation utilities.
 * Every function is pure and operates on plain strings + cursor positions.
 */

export interface EditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Wrap the selected text with a prefix and suffix (e.g. `**bold**`).
 * If nothing is selected, inserts `prefix + placeholder + suffix` and selects the placeholder.
 */
export function wrapSelection(
  value: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string,
  placeholder = "teks"
): EditResult {
  const selected = value.slice(start, end);
  if (selected.length === 0) {
    const insert = `${prefix}${placeholder}${suffix}`;
    return {
      value: value.slice(0, start) + insert + value.slice(end),
      selectionStart: start + prefix.length,
      selectionEnd: start + prefix.length + placeholder.length,
    };
  }

  // If selection is already wrapped, unwrap it
  const before = value.slice(Math.max(0, start - prefix.length), start);
  const after = value.slice(end, end + suffix.length);
  if (before === prefix && after === suffix) {
    return {
      value:
        value.slice(0, start - prefix.length) +
        selected +
        value.slice(end + suffix.length),
      selectionStart: start - prefix.length,
      selectionEnd: start - prefix.length + selected.length,
    };
  }

  const wrapped = `${prefix}${selected}${suffix}`;
  return {
    value: value.slice(0, start) + wrapped + value.slice(end),
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + selected.length,
  };
}

/**
 * Insert a prefix at the start of every selected line (e.g. `> ` for blockquote).
 * If the line already starts with the prefix, it is removed (toggle behaviour).
 */
export function insertAtLineStart(
  value: string,
  start: number,
  end: number,
  prefix: string
): EditResult {
  // Find the true start/end of the affected lines
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const blockEnd = lineEnd === -1 ? value.length : lineEnd;

  const block = value.slice(lineStart, blockEnd);
  const lines = block.split("\n");
  const allHavePrefix = lines.every((l) => l.startsWith(prefix));

  const newLines = allHavePrefix
    ? lines.map((l) => l.slice(prefix.length))
    : lines.map((l) => `${prefix}${l}`);

  const newBlock = newLines.join("\n");
  const delta = newBlock.length - block.length;

  return {
    value: value.slice(0, lineStart) + newBlock + value.slice(blockEnd),
    selectionStart: lineStart,
    selectionEnd: blockEnd + delta,
  };
}

/**
 * Insert a block of text at the cursor position on its own line.
 */
export function insertBlock(
  value: string,
  position: number,
  block: string
): EditResult {
  // Ensure the block is on its own line
  const needsNewlineBefore = position > 0 && value[position - 1] !== "\n";
  const needsNewlineAfter =
    position < value.length && value[position] !== "\n";

  const insert =
    (needsNewlineBefore ? "\n" : "") +
    block +
    (needsNewlineAfter ? "\n" : "");

  const newValue = value.slice(0, position) + insert + value.slice(position);
  const cursorPos = position + insert.length;

  return {
    value: newValue,
    selectionStart: cursorPos,
    selectionEnd: cursorPos,
  };
}

/**
 * Toggle numbered list prefix on selected lines.
 * If all lines start with `N. `, remove the prefix; otherwise add sequential numbers.
 */
export function toggleNumberedList(
  value: string,
  start: number,
  end: number
): EditResult {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const blockEnd = lineEnd === -1 ? value.length : lineEnd;

  const block = value.slice(lineStart, blockEnd);
  const lines = block.split("\n");
  const allNumbered = lines.every((l) => /^\d+\.\s/.test(l));

  const newLines = allNumbered
    ? lines.map((l) => l.replace(/^\d+\.\s/, ""))
    : lines.map((l, i) => `${i + 1}. ${l}`);

  const newBlock = newLines.join("\n");
  const delta = newBlock.length - block.length;

  return {
    value: value.slice(0, lineStart) + newBlock + value.slice(blockEnd),
    selectionStart: lineStart,
    selectionEnd: blockEnd + delta,
  };
}

/**
 * Insert a fenced code block wrapping the selection or at cursor.
 */
export function insertCodeBlock(
  value: string,
  start: number,
  end: number
): EditResult {
  const selected = value.slice(start, end);
  const placeholder = "code";
  const content = selected || placeholder;
  const fence = `\n\`\`\`\n${content}\n\`\`\`\n`;

  const newValue = value.slice(0, start) + fence + value.slice(end);
  const codeStart = start + 5; // after "\n```\n"
  const codeEnd = codeStart + content.length;

  return {
    value: newValue,
    selectionStart: codeStart,
    selectionEnd: codeEnd,
  };
}

/**
 * Count the number of words in a text.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Count the number of characters in a text.
 */
export function countChars(text: string): number {
  return text.length;
}
