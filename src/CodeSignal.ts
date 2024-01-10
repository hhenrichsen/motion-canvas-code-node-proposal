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
  CodeScope,
  CodeTag,
  parseCodeScope,
  PossibleCodeScope,
} from '@components/CodeScope';
import {addInitializer, getPropertyMetaOrCreate} from '@motion-canvas/2d';
import {CodeHighlighter} from '@components/CodeHighlighter';
import {Code} from '@components/Code';
import {defaultTokenize} from '@components/CodeTokenizer';
import {defaultDiffer} from '@components/CodeDiffer';

export type CodeSignal<TOwner> = Signal<
  PossibleCodeScope,
  CodeScope,
  TOwner,
  CodeSignalContext<TOwner>
> & {
  edit(
    duration?: number,
  ): (strings: TemplateStringsArray, ...tags: CodeTag[]) => ThreadGenerator;
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
