import {CodeToken, isCodeToken, stringToToken} from '@components/CodeToken';

export interface CodeFragment {
  before: CodeToken;
  after: CodeToken;
}

export type PossibleCodeFragment =
  | CodeFragment
  | CodeToken
  | {before: string; after: string}
  | string;

export function tokenToFragment(value: CodeToken): CodeFragment {
  return {
    before: value,
    after: value,
  };
}

export function parseCodeFragment(
  value: PossibleCodeFragment,
  context: CanvasRenderingContext2D,
  monoWidth: number,
): CodeFragment {
  let fragment: CodeFragment;
  if (typeof value === 'string') {
    fragment = tokenToFragment(stringToToken(context, monoWidth, value));
  } else if (isCodeToken(value)) {
    fragment = tokenToFragment(value);
  } else {
    fragment = {
      before:
        typeof value.before === 'string'
          ? stringToToken(context, monoWidth, value.before)
          : value.before,
      after:
        typeof value.after === 'string'
          ? stringToToken(context, monoWidth, value.after)
          : value.after,
    };
  }

  return fragment;
}
