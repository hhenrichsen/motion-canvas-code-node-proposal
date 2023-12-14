import {it, expect} from 'vitest';
import {ChangeType, changedItems} from './edits';

it('should find simple strings', () => {
  const [a, e, b, c] = changedItems('abc', 'aebc');
  expect(a).toStrictEqual(['a', 'a', ChangeType.Keep]);
  expect(e).toStrictEqual([null, 'e', ChangeType.Change]);
  expect(b).toStrictEqual(['b', 'b', ChangeType.Keep]);
  expect(c).toStrictEqual(['c', 'c', ChangeType.Keep]);

  const [f, i, g, h] = changedItems('figh', 'fgh');
  expect(f).toStrictEqual(['f', 'f', ChangeType.Keep]);
  expect(i).toStrictEqual(['i', null, ChangeType.Change]);
  expect(g).toStrictEqual(['g', 'g', ChangeType.Keep]);
  expect(h).toStrictEqual(['h', 'h', ChangeType.Keep]);

  const [j, k, l, m] = changedItems('jklm', 'jkml');
  expect(j).toStrictEqual(['j', 'j', ChangeType.Keep]);
  expect(k).toStrictEqual(['k', 'k', ChangeType.Keep]);
  expect(l).toStrictEqual(['l', 'm', ChangeType.Change]);
  expect(m).toStrictEqual(['m', 'l', ChangeType.Change]);

  const [n, o, p, q] = changedItems('nopq', 'nope');
  expect(n).toStrictEqual(['n', 'n', ChangeType.Keep]);
  expect(o).toStrictEqual(['o', 'o', ChangeType.Keep]);
  expect(p).toStrictEqual(['p', 'p', ChangeType.Keep]);
  expect(q).toStrictEqual(['q', 'e', ChangeType.Change]);
});

it('should work with numerical items', () => {
  const [a, e, b] = changedItems([1, 2, 3], [1, 4, 3]);
  expect(a).toStrictEqual([1, 1, ChangeType.Keep]);
  expect(e).toStrictEqual([2, 4, ChangeType.Change]);
  expect(b).toStrictEqual([3, 3, ChangeType.Keep]);
});

it('should work with an array of strings', () => {
  const [a, e, b, c] = changedItems(
    ['aba', 'bcb', 'cdc'],
    ['aba', 'efe', 'bcb', 'cdc'],
  );
  expect(a).toStrictEqual(['aba', 'aba', ChangeType.Keep]);
  expect(e).toStrictEqual([null, 'efe', ChangeType.Change]);
  expect(b).toStrictEqual(['bcb', 'bcb', ChangeType.Keep]);
  expect(c).toStrictEqual(['cdc', 'cdc', ChangeType.Keep]);
});
