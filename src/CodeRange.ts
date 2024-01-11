export type CodePoint = [number, number];

export type CodeRange = [CodePoint, CodePoint];

/**
 * Create a code range that spans the given lines.
 *
 * @param from - The line from which the range starts.
 * @param to - The line at which the range ends. If omitted, the range will
 *             cover only one line.
 */
export function lines(from: number, to?: number): CodeRange {
  return [
    [from, 0],
    [to ?? from, Infinity],
  ];
}

/**
 * Create a code range that highlights the given word.
 *
 * @param line - The line at which the word appears.
 * @param from - The column at which the word starts.
 * @param length - The length of the word. If omitted, the range will cover the
 *                 rest of the line.
 */
export function word(line: number, from: number, length?: number): CodeRange {
  return [
    [line, from],
    [line, from + (length ?? Infinity)],
  ];
}
