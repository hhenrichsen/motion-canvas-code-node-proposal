export enum ChangeType {
  Keep = 0,
  Change = 1,
}

/**
 * Performs the minimum edit distance algorithm on two iterables, then
 * backtracks to find the changes that were made.
 *
 * @param first - The first iterable to look at.
 * @param second - The second iterable to look at.
 * @param eq - A function that determines if two items are equal. Defaults to
 * strict equality.
 * @returns An array of changes that were made to the first iterable to
 * make it equal to the second iterable, as well as the items that were
 * changed.
 *
 * Example:
 * ```ts
 * const [a, e, b, c] = changedItems('abc', 'aebc');
 * a // ['a', 'a', ChangeType.Keep]
 * e // [null, 'e', ChangeType.Change]
 * b // ['b', 'b', ChangeType.Keep]
 * c // ['c', 'c', ChangeType.Keep]
 * ```
 */
export function changedItems<A>(
  first: Iterable<A>,
  second: Iterable<A>,
  eq: (a: A, b: A) => boolean = (a, b) => a === b,
): [A, A, ChangeType][] {
  const a = Array.isArray(first) ? first : Array.from(first);
  const m = a.length;
  const b = Array.isArray(second) ? second : Array.from(second);
  const n = b.length;
  const d: number[][] = [];
  const changes: [A, A, ChangeType][] = [];
  for (let i = 0; i <= m; i++) {
    d[i] = [];
    for (let j = 0; j <= n; j++) {
      d[i][j] = 0;
    }
  }
  for (let i = 1; i <= m; i++) {
    d[i][0] = i;
  }
  for (let j = 1; j <= n; j++) {
    d[0][j] = j;
  }
  for (let j = 1; j <= n; j++) {
    for (let i = 1; i <= m; i++) {
      if (eq(a[i - 1], b[j - 1])) {
        d[i][j] = d[i - 1][j - 1];
      } else {
        d[i][j] = Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]) + 1;
      }
    }
  }

  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && eq(a[i - 1], b[j - 1])) {
      changes.unshift([a[i - 1], b[j - 1], ChangeType.Keep]);
      i--;
      j--;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      changes.unshift([a[i - 1], b[j - 1], ChangeType.Change]);
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      changes.unshift([a[i - 1], null, ChangeType.Change]);
      i--;
    } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
      changes.unshift([null, b[j - 1], ChangeType.Change]);
      j--;
    }
  }
  return changes;
}
