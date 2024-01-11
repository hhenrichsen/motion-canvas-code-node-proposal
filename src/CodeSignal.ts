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
  resolveScope,
} from '@components/CodeScope';
import {addInitializer, getPropertyMetaOrCreate} from '@motion-canvas/2d';
import {CodeHighlighter} from '@components/CodeHighlighter';
import {Code} from '@components/Code';
import {defaultTokenize} from '@components/CodeTokenizer';
import {defaultDiffer} from '@components/CodeDiffer';
import {insert} from '@components/CodeFragment';

interface CodeModifier<TOwner> {
  (code: string): TOwner;
  (code: string, duration: number): ThreadGenerator;
  (duration?: number): TagGenerator;
}

type TagGenerator = (
  strings: TemplateStringsArray,
  ...tags: CodeTag[]
) => ThreadGenerator;

export type CodeSignal<TOwner> = Signal<
  PossibleCodeScope,
  CodeScope,
  TOwner,
  CodeSignalContext<TOwner>
> & {
  edit(duration?: number): TagGenerator;
  append: CodeModifier<CodeSignalContext<TOwner>>;
  prepend: CodeModifier<CodeSignalContext<TOwner>>;
};

export class CodeSignalContext<TOwner> extends SignalContext<
  PossibleCodeScope,
  CodeScope,
  TOwner
> {
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
      this.append(
        resolveScope(
          {
            progress: 0,
            fragments: CODE(strings, ...tags),
          },
          true,
        ),
        savedDuration,
      );
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
      this.prepend(
        resolveScope(
          {
            progress: 0,
            fragments: CODE(strings, ...tags),
          },
          true,
        ),
        savedDuration,
      );
  }

  private *editTween(value: CodeTag[], duration: number) {
    const progress = createSignal(0);
    const scope: CodeScope = {
      progress,
      fragments: value,
    };
    this.set({
      progress: 0,
      fragments: [scope],
    });
    yield* progress(1, duration);
    const current = this.get();
    this.set({
      progress: current.progress,
      fragments: current.fragments.map(fragment =>
        fragment === scope ? resolveScope(scope, true) : fragment,
      ),
    });
    progress.context.dispose();
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
