import {
  DesiredLength,
  PossibleCanvasStyle,
  Shape,
  ShapeProps,
  colorSignal,
  computed,
  initial,
  parser,
  signal,
} from '@motion-canvas/2d';
import {
  Color,
  ColorSignal,
  SerializedVector2,
  SignalValue,
  SimpleSignal,
  ThreadGenerator,
  TimingFunction,
  Vector2,
  createComputed,
  createSignal,
  useLogger,
} from '@motion-canvas/core';
import {highlightTree} from '@lezer/highlight';
import {Parser} from '@lezer/common';
import {parser as jsParser} from '@lezer/javascript';
import {HighlightStyle} from '@codemirror/language';
import {Extension} from '@codemirror/state';
import {correctWhitespace} from './correctWhitespace';

export type CodePoint = [number, number];
export type CodeRange = [CodePoint, CodePoint];
export type CodeInit = [string, SignalValue<string>][];

const v2 = Vector2.createSignal([1, 2]);
const a = CODE`const test = new ${() => v2().toString()}`;

export class CodeSignal {
  public readonly zeroText = createSignal<CodeInit>([['', undefined]]);
  public readonly zeroCombined = createComputed(() => {
    return this.zeroText()
      .map(([text, signal]) => {
        if (signal === undefined) {
          return text;
        }
        if (signal instanceof Function) {
          return text + signal();
        }
        return text + signal;
      })
      .join('');
  });
  public readonly zeroParsed = createComputed(() =>
    this.parser.parse(this.zeroCombined()),
  );

  public readonly oneText = createSignal<CodeInit>([['', undefined]]);
  public readonly oneCombined = createComputed(() => {
    return this.oneText()
      .map(([text, signal]) => {
        if (signal === undefined) {
          return text;
        }
        if (signal instanceof Function) {
          return text + signal();
        }
        return text + signal;
      })
      .join('');
  });
  public readonly oneParsed = createComputed(() =>
    this.parser.parse(this.oneCombined()),
  );
  public readonly progress = createSignal(0);

  public constructor(
    private readonly parser: Parser,
    private readonly dialect: string,
    init: string | CodeInit,
  ) {
    const fixedInit: CodeInit =
      typeof init === 'string' ? [[init, undefined]] : init;
    this.zeroText(fixedInit);
    this.oneText(fixedInit);
  }

  public *append(
    text: SignalValue<string>,
    duration: number,
    timingFunction: TimingFunction,
  ): ThreadGenerator {
    const last = this.oneText().slice(-1)[0];
    if (last[1] === undefined) {
      if (text instanceof Function) {
        this.oneText([...this.oneText().slice(0, -1), [last[0], text]]);
      } else {
        this.oneText([
          ...this.oneText().slice(0, -1),
          [last[0] + text, undefined],
        ]);
      }
    } else {
      if (text instanceof Function) {
        this.oneText([...this.oneText(), ['', text]]);
      } else {
        this.oneText([...this.oneText(), [text, undefined]]);
      }
    }
    yield* this.progress(1, duration, timingFunction);
    this.zeroText(this.oneText());
  }
}

export interface CodeProps extends ShapeProps {
  style?: SignalValue<HighlightStyle | Extension>;
  parser?: SignalValue<Parser>;
  dialect?: SignalValue<string>;
  code?: SignalValue<string>;
  fallbackColor?: SignalValue<PossibleCanvasStyle>;
  children?: never;
}

function zip<A, B>(a: A[], b: B[]): [A, B][] {
  return a.map((a, i) => [a, b[i]]);
}

export function CODE(
  strings: TemplateStringsArray,
  ...tags: SignalValue<string>[]
) {
  return zip([...strings], tags);
}

export class Code extends Shape {
  @initial(jsParser)
  @signal()
  public declare readonly parser: SimpleSignal<Parser, this>;

  @signal()
  public declare readonly dialect: SimpleSignal<string, this>;

  @initial(new Color('red'))
  @colorSignal()
  public declare readonly fallbackColor: ColorSignal<this>;

  private oldStyle = createSignal<HighlightStyle | null>(null);
  private styleProgress = createSignal<number | null>(null);

  @signal()
  public declare readonly style: SimpleSignal<HighlightStyle, this>;

  protected *tweenStyle(
    value: HighlightStyle,
    duration: number,
    timingFunction: TimingFunction,
  ): ThreadGenerator {
    this.oldStyle(this.style());
    this.style(value);
    this.styleProgress(0);
    yield* this.styleProgress(1, duration, timingFunction);
    this.styleProgress(null);
    this.oldStyle(null);
  }

  @parser(function (this: Code, value: string): string {
    return correctWhitespace(value);
  })
  @signal()
  public declare readonly code: SimpleSignal<string, this>;

  @computed()
  protected parsed() {
    return this.parser().parse(this.code());
  }

  @computed()
  protected oldHighlighted() {
    const oldStyle = this.oldStyle();
    if (!oldStyle) {
      return null;
    }
    return this.highlight(oldStyle);
  }

  @computed()
  protected newHighlighted() {
    return this.highlight(this.style());
  }

  @computed()
  protected highlighted() {
    if (this.styleProgress() === null) {
      return this.newHighlighted();
    }
    const zipped = this.newHighlighted().map((token, i) => [
      token,
      this.oldHighlighted()[i],
    ]);

    const blendHsl = (c1: string, c2: string, amount: number): string => {
      return new Color(c1).mix(c2, amount, 'hsl').hex();
    };

    return zipped.map(([newToken, oldToken]) => ({
      token: newToken.token,
      color: blendHsl(newToken.color, oldToken.color, 1 - this.styleProgress()),
    }));
  }

  @computed()
  protected tokens() {
    const segmenter = new Intl.Segmenter('en', {
      granularity: 'word',
    });
    return this.highlighted()
      .map(({token, color}) => {
        // Split tokens so that we preserve emoji and CJK characters.
        return (
          Array.from(segmenter.segment(token), c => c.segment)
            // Combine non-spaced characters within the same token back into
            // segments so that we can draw ligatures.
            .reduce(
              (a, i) =>
                !i.match(/\s/)
                  ? [...a.slice(0, -1), a.slice(-1)[0].concat(i)]
                  : [...a, i],
              [''],
            )
            .map(char => ({
              color,
              token: char,
            }))
        );
      })
      .flat();
  }

  protected highlight(style: HighlightStyle) {
    const tokens: {token: string; color: string}[] = [];
    highlightTree(
      this.parsed(),
      style,
      (from: number, to: number, classList: string) => {
        const rule = style.module
          .getRules()
          .split('\n')
          .find(rule => rule.includes(classList));
        const color = rule.split('color:')[1]?.split(';')[0].trim();

        if (!color) {
          useLogger().warn(`Unknown theme class '${classList}'`);
        }

        // Make sure that all of the characters make it into the list, even
        // if they don't make it through the parser. That shouldn't happen,
        // but it's better to be safe than sorry.
        while (tokens.length < to) {
          const token = {
            token: this.code().substring(tokens.length, tokens.length + 1),
            color: this.fallbackColor().hex(),
          };
          tokens.push(token);
        }

        // Update the existing tokens with the new color and classes.
        for (let i = from; i < to; i++) {
          tokens[i].color = color;
        }
      },
    );

    // Join tokens of the same color so that we can do ligatures and such.
    return tokens.reduce<{color: string; token: string}[]>((acc, token) => {
      if (acc.length === 0) {
        return [token];
      }
      if (acc[acc.length - 1].color === token.color) {
        const e = acc[acc.length - 1];
        e.token += token.token;
      } else {
        acc.push(token);
      }
      return acc;
    }, []);
  }

  public constructor(props?: CodeProps) {
    super({
      fontFamily: 'monospace',
      ...props,
    });
  }

  protected desiredSize(): SerializedVector2<DesiredLength> {
    this.requestFontUpdate();
    const tokens = this.tokens();
    const ctx = this.cacheCanvas();
    ctx.save();
    this.applyStyle(ctx);
    ctx.font = this.styles.font;

    const lh = parseFloat(this.styles.lineHeight);
    let height = lh;
    let width = 0;

    let lineWidth = 0;
    for (const {token} of tokens) {
      lineWidth += ctx.measureText(token).width;
      if (token == '\n') {
        height += lh;
        width = Math.max(lineWidth, width);
        lineWidth = 0;
      }
    }
    ctx.restore();

    return {y: height, x: width};
  }

  protected draw(context: CanvasRenderingContext2D): void {
    // TODO: Write actual render code that's not pulled from the original
    // CodeBlock component.
    this.requestFontUpdate();
    this.applyStyle(context);
    context.font = this.styles.font;
    context.textBaseline = 'top';
    const lh = parseFloat(this.styles.lineHeight);
    const size = this.computedSize();

    const drawToken = (token: string, position: SerializedVector2) => {
      if (token === '\n') {
        position.y += lh;
        position.x = 0;
        return;
      }
      const {width} = context.measureText(token);
      context.fillText(token, position.x, position.y);
      position.x += width;
    };

    context.translate(size.x / -2, size.y / -2);
    const tokens = this.tokens();
    const position = {x: 0, y: 0};
    for (const {token, color} of tokens) {
      context.save();
      context.fillStyle = color ?? '#c9d1d9';
      drawToken(token, position);
      context.restore();
    }
  }
}
