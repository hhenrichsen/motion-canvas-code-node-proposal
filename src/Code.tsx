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
  Signal,
  SignalValue,
  SimpleSignal,
  unwrap,
} from '@motion-canvas/core';
import {CodeHighlighter} from '@components/CodeHighlighter';
import {
  CodeScope,
  parseCodeScope,
  PossibleCodeScope,
  resolveScope,
} from '@components/CodeScope';
import {CodeCursor} from '@components/CodeCursor';

export interface CodeProps extends ShapeProps {
  highlighter?: CodeHighlighter;
  dialect: SignalValue<string>;
  code?: SignalValue<PossibleCodeScope>;
  children?: never;
}

export class Code extends Shape {
  @signal()
  public declare readonly dialect: SimpleSignal<string, this>;

  @initial('')
  @parser(parseCodeScope)
  @signal()
  public declare readonly code: Signal<PossibleCodeScope, CodeScope, this>;

  /**
   * Get the currently displayed code as a string.
   */
  @computed()
  public parsed(): string {
    return resolveScope(this.code(), scope => unwrap(scope.progress) > 0.5);
  }

  @computed()
  public highlighterCache() {
    if (!this.highlighter || !this.highlighter.initialize()) return null;
    const code = this.code();
    const before = resolveScope(code, false);
    const after = resolveScope(code, true);
    const dialect = this.dialect();

    return {
      before: this.highlighter.prepare(before, dialect),
      after: this.highlighter.prepare(after, dialect),
    };
  }

  public readonly highlighter?: CodeHighlighter;

  private readonly cursor = new CodeCursor(this);

  public constructor({highlighter, ...props}: CodeProps) {
    super({
      fontFamily: 'monospace',
      ...props,
    });
    this.highlighter = highlighter;
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
    this.highlighter?.initialize();
  }
}
