import {
  CodeMetrics,
  isCodeMetrics,
  measureString,
} from '@components/CodeMetrics';

export interface CodeFragment {
  before: CodeMetrics;
  after: CodeMetrics;
}

export type PossibleCodeFragment =
  | CodeFragment
  | CodeMetrics
  | {before: string; after: string}
  | string;

export function tokenToFragment(value: CodeMetrics): CodeFragment {
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
    fragment = tokenToFragment(measureString(context, monoWidth, value));
  } else if (isCodeMetrics(value)) {
    fragment = tokenToFragment(value);
  } else {
    fragment = {
      before:
        typeof value.before === 'string'
          ? measureString(context, monoWidth, value.before)
          : value.before,
      after:
        typeof value.after === 'string'
          ? measureString(context, monoWidth, value.after)
          : value.after,
    };
  }

  return fragment;
}
