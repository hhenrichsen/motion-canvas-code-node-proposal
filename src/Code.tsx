import {Shape, ShapeProps, computed, initial, signal} from '@motion-canvas/2d';
import {SignalValue, SimpleSignal, useLogger} from '@motion-canvas/core';
import {classHighlighter, highlightTree, tags} from '@lezer/highlight';
import {Parser} from '@lezer/common';
import {parser as jsParser} from '@lezer/javascript';

export type CodePoint = [number, number];
export type CodeRange = [CodePoint, CodePoint];

export type Theme = {
  [K in keyof typeof tags as Exclude<
    K,
    'toString' | 'prototype' | 'length'
  >]?: string;
} & {
  default: string;
};

export interface CodeProps extends ShapeProps {
  theme: SignalValue<Theme>;
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
  public declare readonly theme: SimpleSignal<Theme, this>;

  @signal()
  public declare readonly code: SimpleSignal<string, this>;

  @computed()
  protected parsed() {
    return this.parser().parse(this.code());
  }

  @computed()
  protected highlighted() {
    const tokens: {token: string; color: string; classes: string[]}[] = [];
    highlightTree(
      this.parsed(),
      classHighlighter,
      (from: number, to: number, classList: string) => {
        const classes = classList.split(' ').map(c => c.split('tok-')[1]);
        const cls = classes.find((c): c is keyof Theme => c in this.theme());
        if (!cls) {
          useLogger().warn(
            `Unknown theme class${
              classes.length > 1 ? 'es' : ''
            } '${classes.join(', ')}'`,
          );
        }

        const color = this.theme()[cls ?? 'default'];

        // Make sure that all of the characters make it into the list, even
        // if they don't make it through the parser. That shouldn't happen,
        // but it's better to be safe than sorry.
        while (tokens.length < to) {
          tokens.push({
            token: this.code().substring(tokens.length, tokens.length + 1),
            color: this.theme().default,
            classes: [],
          });
        }

        // Update the existing tokens with the new color and classes.
        for (let i = from; i < to; i++) {
          tokens[i].color = color;
          tokens[i].classes.push(...classes);
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
