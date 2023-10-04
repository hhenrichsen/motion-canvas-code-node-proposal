type Subsequence = {
  aIndex: number;
  bIndex: number;
  prev?: Subsequence | undefined;
};

/**
 * Performs a patience diff on two arrays of strings, returning an object
 * containing the lines that were deleted, inserted, and potentially moved
 * lines. The plus parameter can result in a significant performance hit due
 * to additional Longest Common Substring searches.
 *
 * @param aLines - The original array of strings
 * @param bLines - The new array of strings
 * @param plus - Whether to return the moved lines
 *
 *
 *
 * Adapted from Jonathan "jonTrent" Trent's patience-diff algorithm.
 * Types and tests added by Hunter "hhenrichsen" Henrichsen.
 *
 * {@link https://github.com/jonTrent/PatienceDiff}
 */
export function patienceDiff(
  aLines: string[],
  bLines: string[],
  plus: boolean = false,
): typeof plus extends true
  ? {
      lines: {
        line: string;
        aIndex: number;
        bIndex: number;
        moved: boolean;
      }[];
      lineCountDeleted: number;
      lineCountInserted: number;
      lineCountMoved: number;
    }
  : {
      lines: {
        line: string;
        aIndex: number;
        bIndex: number;
      }[];
      lineCountDeleted: number;
      lineCountInserted: number;
    } {
  /**
   * Finds all unique values in lines[start...end], inclusive. This
   * function is used in preparation for determining the longest common
   * subsequence.
   *
   * @param lines - The array to search
   * @param start - The starting index (inclusive)
   * @param end - The ending index (inclusive)
   * @returns A map of the unique lines to their index
   */
  function findUnique(lines: string[], start: number, end: number) {
    const lineMap = new Map<string, {count: number; index: number}>();
    for (let i = start; i <= end; i++) {
      const line = lines[i];
      if (lineMap.has(line)) {
        lineMap.get(line).count++;
        lineMap.get(line).index = i;
      } else {
        lineMap.set(line, {count: 1, index: i});
      }
    }
    return [...lineMap.entries()].reduce((newMap, [key, value]) => {
      if (value.count === 1) {
        newMap.set(key, value.index);
      }
      return newMap;
    }, new Map<string, number>());
  }

  /**
   * Finds all the unique common entries between aArray[aStart...aEnd] and
   * bArray[bStart...bEnd], inclusive. This function uses findUnique to pare
   * down the aArray and bArray ranges first, before then walking the
   * comparison between the two arrays.
   *
   *
   * @param aArray - The original array
   * @param aStart - The start of the original array to search
   * @param aEnd - The end of the original array to search, inclusive
   * @param bArray - The new array
   * @param bStart - the start of the new array to search
   * @param bEnd - The end of the new array to search, inclusive
   * @returns a Map, with the key as the common line between aArray and
   * bArray, with the value as an object containing the array indices of the
   * matching uniqe lines.
   */
  function uniqueCommon(
    aArray: string[],
    aStart: number,
    aEnd: number,
    bArray: string[],
    bStart: number,
    bEnd: number,
  ): Map<string, Subsequence> {
    const aUnique = findUnique(aArray, aStart, aEnd);
    const bUnique = findUnique(bArray, bStart, bEnd);

    return [...aUnique.entries()].reduce<Map<string, Subsequence>>(
      (paired, [key, value]) => {
        if (bUnique.has(key)) {
          paired.set(key, {
            aIndex: value,
            bIndex: bUnique.get(key),
          });
        }
        return paired;
      },
      new Map(),
    );
  }

  /**
   * Takes a map from the unique common lines between two arrays and determines
   * the longest common subsequence.
   *
   * @see uniqueCommon
   *
   * @param abMap - The map of unique common lines between two arrays.
   * @returns An array of objects containing the indices of the longest common
   * subsequence.
   */
  function longestCommonSubsequence(
    abMap: Map<string, Subsequence>,
  ): Subsequence[] {
    const jagged: Subsequence[][] = [];

    abMap.forEach(value => {
      let i = 0;
      while (
        jagged[i] &&
        jagged[i][jagged[i].length - 1].bIndex < value.bIndex
      ) {
        i++;
      }

      if (!jagged[i]) {
        jagged[i] = [];
      }

      if (i > 0) {
        value.prev = jagged[i - 1][jagged[i - 1].length - 1];
      }

      jagged[i].push(value);
    });

    // Pull out the longest common subsequence
    let lcs: Subsequence[] = [];

    if (jagged.length > 0) {
      const size = jagged.length - 1;
      lcs = [jagged[size][jagged[size].length - 1]];
      while (lcs[lcs.length - 1].prev) {
        lcs.push(lcs[lcs.length - 1].prev);
      }
    }

    return lcs.reverse();
  }

  /**
   * Keeps track of the aLines that have been deleted, are shared between aLines
   * and bLines, and bLines that have been inserted.
   */
  const result: {
    line: string;
    aIndex: number;
    bIndex: number;
    moved: boolean;
  }[] = [];
  let deleted = 0;
  let inserted = 0;

  /**
   * aLines that don't match
   */
  const aMove: string[] = [];
  const aMoveIndex: number[] = [];

  /**
   * bLines that don't match
   */
  const bMove: string[] = [];
  const bMoveIndex: number[] = [];

  function addToResult(aIndex: number, bIndex: number) {
    if (bIndex < 0) {
      aMove.push(aLines[aIndex]);
      aMoveIndex.push(result.length);
      deleted++;
    } else if (aIndex < 0) {
      bMove.push(bLines[bIndex]);
      bMoveIndex.push(result.length);
      inserted++;
    }
    result.push({
      line: 0 <= aIndex ? aLines[aIndex] : bLines[bIndex],
      aIndex,
      bIndex,
      moved: false,
    });
  }

  function addSubMatch(
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number,
  ) {
    // Match any lines at the beginning of aLines and bLines.
    while (
      aStart <= aEnd &&
      bStart <= bEnd &&
      aLines[aStart] === bLines[bStart]
    ) {
      addToResult(aStart++, bStart++);
    }

    // Match any lines at the end of aLines and bLines, but don't place them
    // in the "result" array just yet, as the lines between these matches at
    // the beginning and the end need to be analyzed first.
    const aEndTemp = aEnd;
    while (aStart <= aEnd && bStart <= bEnd && aLines[aEnd] === bLines[bEnd]) {
      aEnd--;
      bEnd--;
    }

    // Now, check to determine with the remaining lines in the subsequence
    // whether there are any unique common lines between aLines and bLines.
    //
    // If not, add the subsequence to the result (all aLines having been
    // deleted, and all bLines having been inserted).
    //
    // If there are unique common lines between aLines and bLines, then let's
    // recursively perform the patience diff on the subsequence.
    const uniqueCommonMap = uniqueCommon(
      aLines,
      aStart,
      aEnd,
      bLines,
      bStart,
      bEnd,
    );

    if (uniqueCommonMap.size === 0) {
      while (aStart <= aEnd) {
        addToResult(aStart++, -1);
      }
      while (bStart <= bEnd) {
        addToResult(-1, bStart++);
      }
    } else {
      recurseLCS(aStart, aEnd, bStart, bEnd, uniqueCommonMap);
    }

    // Finally, let's add the matches at the end to the result.
    while (aEnd < aEndTemp) {
      addToResult(++aEnd, ++bEnd);
    }
  }

  /**
   * Finds the longest common subsequence between the arrays
   * aLines[aStart...aEnd] and bLines[bStart...bEnd], inclusive. Then for each
   * subsequence, recursively performs another LCS search (via addSubMatch),
   * until there are none found, at which point the subsequence is dumped to
   * the result.
   *
   * @param aStart - The start of the original array to search
   * @param aEnd - The end of the original array to search, inclusive
   * @param bStart - The start of the new array to search
   * @param bEnd - The end of the new array to search, inclusive
   * @param uniqueCommonMap - A map of the unique common lines between
   * aLines[aStart...aEnd] and bLines[bStart...bEnd], inclusive.
   */
  function recurseLCS(
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number,
    uniqueCommonMap: Map<string, Subsequence> = uniqueCommon(
      aLines,
      aStart,
      aEnd,
      bLines,
      bStart,
      bEnd,
    ),
  ) {
    const lcs = longestCommonSubsequence(uniqueCommonMap);

    if (lcs.length === 0) {
      addSubMatch(aStart, aEnd, bStart, bEnd);
    } else {
      if (aStart < lcs[0].aIndex || bStart < lcs[0].bIndex) {
        addSubMatch(aStart, lcs[0].aIndex - 1, bStart, lcs[0].bIndex - 1);
      }

      let i;
      for (i = 0; i < lcs.length - 1; i++) {
        addSubMatch(
          lcs[i].aIndex,
          lcs[i + 1].aIndex - 1,
          lcs[i].bIndex,
          lcs[i + 1].bIndex - 1,
        );
      }

      if (lcs[i].aIndex <= aEnd || lcs[i].bIndex <= bEnd) {
        addSubMatch(lcs[i].aIndex, aEnd, lcs[i].bIndex, bEnd);
      }
    }
  }

  recurseLCS(0, aLines.length - 1, 0, bLines.length - 1);

  if (!plus) {
    return {
      lines: result,
      lineCountDeleted: deleted,
      lineCountInserted: inserted,
    };
  }

  const difference = {
    lines: result,
    lineCountDeleted: deleted,
    lineCountInserted: inserted,
    lineCountMoved: 0,
    aMove: aMove,
    aMoveIndex: aMoveIndex,
    bMove: bMove,
    bMoveIndex: bMoveIndex,
  };

  let aMoveNext = difference.aMove;
  let aMoveIndexNext = difference.aMoveIndex;
  let bMoveNext = difference.bMove;
  let bMoveIndexNext = difference.bMoveIndex;

  delete difference.aMove;
  delete difference.aMoveIndex;
  delete difference.bMove;
  delete difference.bMoveIndex;

  let lastLineCountMoved;

  do {
    const aMove = aMoveNext;
    const aMoveIndex = aMoveIndexNext;
    const bMove = bMoveNext;
    const bMoveIndex = bMoveIndexNext;

    aMoveNext = [];
    aMoveIndexNext = [];
    bMoveNext = [];
    bMoveIndexNext = [];

    const subDiff = patienceDiff(aMove, bMove);

    lastLineCountMoved = difference.lineCountMoved;

    subDiff.lines.forEach(value => {
      if (0 <= value.aIndex && 0 <= value.bIndex) {
        difference.lines[aMoveIndex[value.aIndex]].moved = true;
        difference.lines[bMoveIndex[value.bIndex]].aIndex =
          aMoveIndex[value.aIndex];
        difference.lines[bMoveIndex[value.bIndex]].moved = true;
        difference.lineCountInserted--;
        difference.lineCountDeleted--;
        difference.lineCountMoved++;
      } else if (value.bIndex < 0) {
        aMoveNext.push(aMove[value.aIndex]);
        aMoveIndexNext.push(aMoveIndex[value.aIndex]);
      } else {
        bMoveNext.push(bMove[value.bIndex]);
        bMoveIndexNext.push(bMoveIndex[value.bIndex]);
      }
    });
  } while (0 < difference.lineCountMoved - lastLineCountMoved);

  return difference;
}

/**
 * Utility function for debugging patienceDiff.
 */
export function printDiff(diff: ReturnType<typeof patienceDiff>) {
  diff.lines.forEach(line => {
    if (line.bIndex < 0) {
      console.log(`- ${line.line}`);
    } else if (line.aIndex < 0) {
      console.log(`+ ${line.line}`);
    } else {
      console.log(`  ${line.line}`);
    }
  });
}
