import {
  createSignal,
  deepLerp,
  DependencyContext,
  Signal,
  SignalContext,
  SignalValue,
  ThreadGenerator,
  TimingFunction,
  unwrap,
} from '@motion-canvas/core';
import {
  CODE,
  CodeScope,
  CodeTag,
  parseCodeScope,
  PossibleCodeScope,
  resolveCodeTag,
} from '@components/CodeScope';
import {addInitializer, getPropertyMetaOrCreate} from '@motion-canvas/2d';
import {CodeHighlighter} from '@components/CodeHighlighter';
import {Code} from '@components/Code';
import {defaultTokenize} from '@components/CodeTokenizer';
import {defaultDiffer} from '@components/CodeDiffer';
import {insert, replace} from '@components/CodeFragment';
import {CodePoint, CodeRange} from '@components/CodeRange';
import {extractRange} from '@components/extractRange';

interface CodeModifier<TOwner> {
  (code: string): TOwner;
  (code: string, duration: number): ThreadGenerator;
  (duration?: number): TagGenerator;
}

interface CodeInsert<TOwner> {
  (point: CodePoint, code: string): TOwner;
  (point: CodePoint, code: string, duration: number): ThreadGenerator;
}

interface CodeRemove<TOwner> {
  (range: CodeRange): TOwner;
  (range: CodeRange, duration: number): ThreadGenerator;
}

interface CodeReplace<TOwner> {
  (range: CodeRange, code: string): TOwner;
  (range: CodeRange, code: string, duration: number): ThreadGenerator;
}

type TagGenerator = (
  strings: TemplateStringsArray,
  ...tags: CodeTag[]
) => ThreadGenerator;

interface CodeSignalHelpers<TOwner> {
  edit(duration?: number): TagGenerator;
  append: CodeModifier<CodeSignalContext<TOwner>>;
  prepend: CodeModifier<CodeSignalContext<TOwner>>;
  insert: CodeInsert<CodeSignalContext<TOwner>>;
  remove: CodeRemove<CodeSignalContext<TOwner>>;
  replace: CodeReplace<CodeSignalContext<TOwner>>;
}

export type CodeSignal<TOwner> = Signal<
  PossibleCodeScope,
  CodeScope,
  TOwner,
  CodeSignalContext<TOwner>
> &
  CodeSignalHelpers<TOwner>;

export class CodeSignalContext<TOwner>
  extends SignalContext<PossibleCodeScope, CodeScope, TOwner>
  implements CodeSignalHelpers<TOwner>
{
  private readonly progress = createSignal(0);

  public constructor(
    initial: PossibleCodeScope,
    owner: TOwner,
    private readonly highlighter?: SignalValue<CodeHighlighter>,
    private readonly dialect?: SignalValue<string>,
  ) {
    super(initial, deepLerp, owner);
    if (owner instanceof Code) {
      this.highlighter ??= owner.highlighter;
      this.dialect ??= owner.dialect;
    }
    Object.defineProperty(this.invokable, 'edit', {
      value: this.edit.bind(this),
    });
    Object.defineProperty(this.invokable, 'append', {
      value: this.append.bind(this),
    });
    Object.defineProperty(this.invokable, 'prepend', {
      value: this.prepend.bind(this),
    });
    Object.defineProperty(this.invokable, 'insert', {
      value: this.insert.bind(this),
    });
    Object.defineProperty(this.invokable, 'remove', {
      value: this.remove.bind(this),
    });
    Object.defineProperty(this.invokable, 'replace', {
      value: this.replace.bind(this),
    });
  }

  public override *tweener(
    value: SignalValue<PossibleCodeScope>,
    duration: number,
    timingFunction: TimingFunction,
  ): ThreadGenerator {
    let tokenize = defaultTokenize;
    const highlighter = unwrap(this.highlighter);
    const dialect = unwrap(this.dialect);
    if (highlighter && dialect) {
      yield (async () => {
        do {
          await DependencyContext.consumePromises();
          highlighter.initialize();
        } while (DependencyContext.hasPromises());
      })();
      tokenize = (input: string) => highlighter.tokenize(input, dialect);
    }

    this.progress(0);
    this.set({
      progress: this.progress,
      fragments: defaultDiffer(this.get(), this.parse(unwrap(value)), tokenize),
    });
    yield* this.progress(1, duration, timingFunction);
    this.set(value);
  }

  public edit(duration: number = 0.6): TagGenerator {
    return (strings, ...tags) =>
      this.editTween(CODE(strings, ...tags), duration);
  }

  public append(code: string): this;
  public append(code: string, duration: number): ThreadGenerator;
  public append(duration?: number): TagGenerator;
  public append(
    first: string | number = 0.6,
    duration?: number,
  ): this | ThreadGenerator | TagGenerator {
    if (typeof first === 'string') {
      if (duration === undefined) {
        const current = this.get();
        this.set({
          progress: 0,
          fragments: [...current.fragments, first],
        });
        return this;
      } else {
        return this.appendTween(first, duration);
      }
    }

    const savedDuration = first;
    return (strings, ...tags) =>
      this.append(resolveCodeTag(CODE(strings, ...tags), true), savedDuration);
  }

  public prepend(code: string): this;
  public prepend(code: string, duration: number): ThreadGenerator;
  public prepend(duration?: number): TagGenerator;
  public prepend(
    first: string | number = 0.6,
    duration?: number,
  ): this | ThreadGenerator | TagGenerator {
    if (typeof first === 'string') {
      if (duration === undefined) {
        const current = this.get();
        this.set({
          progress: 0,
          fragments: [first, ...current.fragments],
        });
        return this;
      } else {
        return this.prependTween(first, duration);
      }
    }

    const savedDuration = first;
    return (strings, ...tags) =>
      this.prepend(resolveCodeTag(CODE(strings, ...tags), true), savedDuration);
  }

  public insert(point: CodePoint, code: string): this;
  public insert(
    point: CodePoint,
    code: string,
    duration: number,
  ): ThreadGenerator;
  public insert(
    point: CodePoint,
    code: string,
    duration?: number,
  ): this | ThreadGenerator {
    return this.replace([point, point], code, duration);
  }

  public remove(range: CodeRange): this;
  public remove(range: CodeRange, duration: number): ThreadGenerator;
  public remove(range: CodeRange, duration?: number): this | ThreadGenerator {
    return this.replace(range, '', duration);
  }

  public replace(range: CodeRange, code: string): this;
  public replace(
    range: CodeRange,
    code: string,
    duration: number,
  ): ThreadGenerator;
  public replace(
    range: CodeRange,
    code: string,
    duration?: number,
  ): this | ThreadGenerator {
    if (duration === undefined) {
      const current = this.get();
      const [fragments, index] = extractRange(range, current.fragments);
      fragments[index] = code;
      this.set({
        progress: current.progress,
        fragments,
      });
    } else {
      return this.replaceTween(range, code, duration);
    }
  }

  private *replaceTween(range: CodeRange, code: string, duration: number) {
    let current = this.get();
    const [fragments, index] = extractRange(range, current.fragments);
    const progress = createSignal(0);
    const scope = {
      progress,
      fragments: [replace(fragments[index] as string, code)],
    };
    fragments[index] = scope;
    this.set({
      progress: current.progress,
      fragments,
    });

    yield* progress(1, duration);

    current = this.get();
    this.set({
      progress: current.progress,
      fragments: current.fragments.map(fragment =>
        fragment === scope ? code : fragment,
      ),
    });
    progress.context.dispose();
  }

  private *editTween(value: CodeTag[], duration: number) {
    this.progress(0);
    this.set({
      progress: this.progress,
      fragments: value,
    });
    yield* this.progress(1, duration);
    const current = this.get();
    this.set({
      progress: 0,
      fragments: current.fragments.map(fragment =>
        value.includes(fragment) ? resolveCodeTag(fragment, true) : fragment,
      ),
    });
  }

  private *appendTween(value: string, duration: number) {
    let current = this.get();
    const progress = createSignal(0);
    const scope = {
      progress,
      fragments: [insert(value)],
    };
    this.set({
      progress: current.progress,
      fragments: [...current.fragments, scope],
    });
    yield* progress(1, duration);
    current = this.get();
    this.set({
      progress: current.progress,
      fragments: current.fragments.map(fragment =>
        fragment === scope ? value : fragment,
      ),
    });
    progress.context.dispose();
  }

  private *prependTween(value: string, duration: number) {
    let current = this.get();
    const progress = createSignal(0);
    const scope = {
      progress,
      fragments: [insert(value)],
    };
    this.set({
      progress: current.progress,
      fragments: [scope, ...current.fragments],
    });
    yield* progress(1, duration);
    current = this.get();
    this.set({
      progress: current.progress,
      fragments: current.fragments.map(fragment =>
        fragment === scope ? value : fragment,
      ),
    });
    progress.context.dispose();
  }

  public override parse(value: PossibleCodeScope): CodeScope {
    return parseCodeScope(value);
  }

  public override toSignal(): CodeSignal<TOwner> {
    return this.invokable;
  }
}

export function codeSignal(): PropertyDecorator {
  return (target: any, key) => {
    const meta = getPropertyMetaOrCreate<PossibleCodeScope>(target, key);
    addInitializer(target, (instance: any) => {
      instance[key] = new CodeSignalContext(
        meta.default ?? [],
        instance,
      ).toSignal();
    });
  };
}
