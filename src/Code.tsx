import {
  computed,
  DesiredLength,
  initial,
  parser,
  Shape,
  ShapeProps,
  signal,
} from '@motion-canvas/2d';
import {
  SerializedVector2,
  SignalValue,
  SimpleSignal,
  ThreadGenerator,
  TimingFunction,
  unwrap,
  createSignal,
  Vector2,
  map,
  Signal,
} from '@motion-canvas/core';
import {CodeHighlighter} from '@components/CodeHighlighter';
import {PossibleCodeScope, resolveScope} from '@components/CodeScope';
import {CodeCursor} from '@components/CodeCursor';
import {LezerHighlighter} from '@components/LezerHighlighter';
import {DefaultHighlightStyle} from '@components/DefaultHighlightStyle';
import {
  CodeSignal,
  codeSignal,
  CodeSignalContext,
} from '@components/CodeSignal';
import {CodeRange, lines} from '@components/CodeRange';
import {
  CodeSelection,
  parseCodeSelection,
  PossibleCodeSelection,
} from '@components/CodeSelection';

export interface DrawTokenHook {
  (
    ctx: CanvasRenderingContext2D,
    text: string,
    position: Vector2,
    color: string,
    selection: number,
  ): void;
}

export interface DrawHooks {
  token: DrawTokenHook;
}

export interface CodeProps extends ShapeProps {
  highlighter?: SignalValue<CodeHighlighter | null>;
  dialect: SignalValue<string>;
  code?: SignalValue<PossibleCodeScope>;
  selection?: SignalValue<PossibleCodeSelection>;
  drawHooks?: SignalValue<DrawHooks>;
  children?: never;
}

export class Code extends Shape {
  /**
   * Create a standalone code signal.
   *
   * @param initial - The initial code.
   * @param highlighter - Custom highlighter to use.
   * @param dialect - Custom dialect to use.
   */
  public static createSignal(
    initial: PossibleCodeScope,
    highlighter?: SignalValue<CodeHighlighter>,
    dialect?: SignalValue<string>,
  ): CodeSignal<void> {
    return new CodeSignalContext<void>(
      initial,
      undefined,
      highlighter,
      dialect,
    ).toSignal();
  }

  public static readonly highlighter = new LezerHighlighter(
    DefaultHighlightStyle,
  );

  @signal()
  public declare readonly dialect: SimpleSignal<string, this>;

  @initial(Code.highlighter)
  @signal()
  public declare readonly highlighter: SimpleSignal<CodeHighlighter, this>;

  @codeSignal()
  public declare readonly code: CodeSignal<this>;

  @initial<DrawHooks>({
    token(ctx, text, position, color, selection) {
      ctx.fillStyle = color;
      ctx.globalAlpha *= map(0.2, 1, selection);
      ctx.fillText(text, position.x, position.y);
    },
  })
  @signal()
  public declare readonly drawHooks: SimpleSignal<DrawHooks, this>;

  @initial(lines(0, Infinity))
  @parser(parseCodeSelection)
  @signal()
  public declare readonly selection: Signal<
    PossibleCodeSelection,
    CodeSelection,
    this
  >;
  public oldSelection: CodeSelection | null = null;
  public selectionProgress = createSignal<number | null>(null);
  protected *tweenSelection(
    value: CodeRange[],
    duration: number,
    timingFunction: TimingFunction,
  ): ThreadGenerator {
    this.oldSelection = this.selection();
    this.selection(value);
    this.selectionProgress(0);
    yield* this.selectionProgress(1, duration, timingFunction);
    this.selectionProgress(null);
    this.oldSelection = null;
  }

  /**
   * Get the currently displayed code as a string.
   */
  @computed()
  public parsed(): string {
    return resolveScope(this.code(), scope => unwrap(scope.progress) > 0.5);
  }

  @computed()
  public highlighterCache() {
    const highlighter = this.highlighter();
    if (!highlighter || !highlighter.initialize()) return null;
    const code = this.code();
    const before = resolveScope(code, false);
    const after = resolveScope(code, true);
    const dialect = this.dialect();

    return {
      before: highlighter.prepare(before, dialect),
      after: highlighter.prepare(after, dialect),
    };
  }

  private readonly cursor = new CodeCursor(this);

  public constructor(props: CodeProps) {
    super({
      fontFamily: 'monospace',
      ...props,
    });
  }

  /**
   * Create a child code signal.
   *
   * @param initial - The initial code.
   */
  public createSignal(initial: PossibleCodeScope): CodeSignal<this> {
    return new CodeSignalContext<this>(
      initial,
      this,
      this.highlighter,
      this.dialect,
    ).toSignal();
  }

  protected override desiredSize(): SerializedVector2<DesiredLength> {
    this.requestFontUpdate();
    const context = this.cacheCanvas();
    const code = this.code();

    context.save();
    this.applyStyle(context);
    context.font = this.styles.font;
    this.cursor.reset(context);
    this.cursor.measureSize(code);
    const size = this.cursor.getSize();
    context.restore();

    return size;
  }

  protected override draw(context: CanvasRenderingContext2D): void {
    this.requestFontUpdate();
    this.applyStyle(context);
    const code = this.code();
    const size = this.computedSize();

    context.translate(-size.width / 2, -size.height / 2);
    context.font = this.styles.font;
    context.textBaseline = 'top';

    this.cursor.reset(context);
    this.cursor.drawScope(code);
  }

  protected override collectAsyncResources(): void {
    super.collectAsyncResources();
    this.highlighter()?.initialize();
  }
}
