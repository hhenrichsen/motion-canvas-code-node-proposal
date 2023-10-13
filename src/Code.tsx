import {Shape, ShapeProps, computed, initial, signal} from '@motion-canvas/2d';
import {
  SerializedVector2,
  SignalValue,
  SimpleSignal,
  useLogger,
} from '@motion-canvas/core';
import {highlightTree} from '@lezer/highlight';
import {Parser} from '@lezer/common';
import {parser as jsParser} from '@lezer/javascript';
import {HighlightStyle} from '@codemirror/language';
import {Extension} from '@codemirror/state';

export type CodePoint = [number, number];
export type CodeRange = [CodePoint, CodePoint];

export interface CodeProps extends ShapeProps {
  style?: SignalValue<HighlightStyle | Extension>;
  parser?: SignalValue<Parser>;
  dialect?: SignalValue<string>;
  code?: SignalValue<string>;
  children?: never;
}

export class Code extends Shape {
  @initial(jsParser)
  @signal()
  public declare readonly parser: SimpleSignal<Parser, this>;

  @signal()
  public declare readonly dialect: SimpleSignal<string, this>;

  @signal()
  public declare readonly style: SimpleSignal<HighlightStyle, this>;

  // TODO: Figure out if we can go from Extension -> HighlightStyle
  // @computed()
  // protected highlightStyle(): HighlightStyle {
  //   const rawStyle = this.style();
  //   if (!(rawStyle instanceof HighlightStyle)) {
  //     debugger;
  //     if (Array.isArray(rawStyle)) {
  //       rawStyle.find(
  //         extension => (extension as any)?.value instanceof StyleModule,
  //       );
  //     }
  //   } else {
  //     return rawStyle;
  //   }
  // }

  @signal()
  public declare readonly code: SimpleSignal<string, this>;

  @computed()
  protected parsed() {
    return this.parser().parse(this.code());
  }

  @computed()
  protected highlighted() {
    const tokens: {token: string; color: string}[] = [];
    highlightTree(
      this.parsed(),
      this.style(),
      (from: number, to: number, classList: string) => {
        const rule = this.style()
          .module.getRules()
          .split('\n')
          .find(rule => rule.includes(classList));
        const color = rule.split('color:')[1]?.split(';')[0];

        if (!color) {
          useLogger().warn(`Unknown theme class '${classList}'`);
        }

        // Make sure that all of the characters make it into the list, even
        // if they don't make it through the parser. That shouldn't happen,
        // but it's better to be safe than sorry.
        while (tokens.length < to) {
          const token = {
            token: this.code().substring(tokens.length, tokens.length + 1),
            color: 'red',
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
    return tokens.reduce((acc, token) => {
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

  protected draw(context: CanvasRenderingContext2D): void {
    // TODO: Write actual render code that's not pulled from the original
    // CodeBlock component.
    this.requestFontUpdate();
    this.applyStyle(context);
    context.font = this.styles.font;
    context.textBaseline = 'top';
    const lh = parseFloat(this.styles.lineHeight);
    const size = this.computedSize();
    const segmenter = new Intl.Segmenter('en', {
      granularity: 'word',
    });

    const drawToken = (code: string, position: SerializedVector2) => {
      // Combine non-spaced characters back into segments so that we can
      // draw ligatures.
      const chars = Array.from(segmenter.segment(code), c => c.segment).reduce(
        (a, i) =>
          !i.match(/\s/)
            ? [...a.slice(0, -1), a.slice(-1)[0].concat(i)]
            : [...a, i],
        [''],
      );

      for (const char of chars) {
        console.log(char);
        if (char === '\n') {
          position.y += lh;
          position.x = 0;
          continue;
        }
        const {width} = context.measureText(char);
        context.fillText(char, position.x, position.y);
        position.x += width;
      }
    };

    context.translate(size.x / -2, size.y / -2);
    const highlighted = this.highlighted();
    const position = {x: 0, y: 0};
    for (const {token, color} of highlighted) {
      context.save();
      context.fillStyle = color ?? '#c9d1d9';
      drawToken(token, position);
      context.restore();
    }
  }
}
