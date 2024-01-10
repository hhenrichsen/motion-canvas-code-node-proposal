import {SignalValue, unwrap} from '@motion-canvas/core';
import {CodeFragment, PossibleCodeFragment} from '@components/CodeFragment';
import {isCodeToken} from '@components/CodeToken';

export interface CodeScope {
  progress: SignalValue<number>;
  fragments: Iterable<CodeTag>;
}

export type PossibleCodeScope = CodeScope | Iterable<CodeTag> | string;

export type CodeTag = SignalValue<PossibleCodeFragment | CodeFragment>;

export function* CODE(
  strings: TemplateStringsArray,
  ...tags: CodeTag[]
): Generator<CodeTag> {
  for (let i = 0; i < strings.length; i++) {
    yield strings[i];
    if (tags[i] !== undefined) {
      yield tags[i];
    }
  }
}

export function isCodeScope(value: any): value is CodeScope {
  return value?.fragments !== undefined;
}

export function parseCodeScope(value: PossibleCodeScope): CodeScope {
  if (typeof value === 'string') {
    return {
      progress: 0,
      fragments: [value],
    };
  }

  if (Symbol.iterator in value) {
    return {
      progress: 0,
      fragments: value,
    };
  }

  return value;
}

export function resolveScope(
  scope: CodeScope,
  predicate: ((scope: CodeScope) => boolean) | boolean,
): string {
  let code = '';
  const isAfter = typeof predicate === 'boolean' ? predicate : predicate(scope);
  for (const wrapped of scope.fragments) {
    const fragment = unwrap(wrapped);
    if (typeof fragment === 'string') {
      code += fragment;
    } else if (isCodeScope(fragment)) {
      code += resolveScope(fragment, predicate);
    } else if (isCodeToken(fragment)) {
      code += fragment.content;
    } else {
      code += isAfter
        ? typeof fragment.after === 'string'
          ? fragment.after
          : fragment.after.content
        : typeof fragment.before === 'string'
          ? fragment.before
          : fragment.before.content;
    }
  }

  return code;
}
