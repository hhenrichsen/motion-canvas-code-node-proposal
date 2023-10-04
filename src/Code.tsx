import {Shape, ShapeProps, computed, initial, signal} from '@motion-canvas/2d';
import {SignalValue, SimpleSignal, useLogger} from '@motion-canvas/core';
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
        console.log(this.code().substring(from, to) + ' ' + rule);
        const color = rule.split('color:')[1]?.split(';')[0];

        if (!color) {
          useLogger().warn(`Unknown theme class '${classList}'`);
        }

        // Make sure that all of the characters make it into the list, even
        // if they don't make it through the parser. That shouldn't happen,
        // but it's better to be safe than sorry.
        while (tokens.length < to) {
          tokens.push({
            token: this.code().substring(tokens.length, tokens.length + 1),
            color: 'red',
          });
        }

        // Update the existing tokens with the new color and classes.
        for (let i = from; i < to; i++) {
          tokens[i].color = color;
        }
      },
    );
    return tokens;
  }

  public constructor(props?: CodeProps) {
    super({
      fontFamily: 'monospace',
      ...props,
    });
  }
}
