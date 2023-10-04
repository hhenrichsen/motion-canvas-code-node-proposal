import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {waitFor} from '@motion-canvas/core/lib/flow';
import {Code} from '@components/Code';
import {createRef} from '@motion-canvas/core';
import {HighlightStyle} from '@codemirror/language';
import {tags as t} from '@lezer/highlight';

export default makeScene2D(function* (view) {
  // Create your animations here

  const c = createRef<Code>();
  const style = HighlightStyle.define([
    {tag: t.keyword, color: '#5e81ac'},
    {
      tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
      color: '#88c0d0',
    },
    {tag: [t.variableName], color: '#8fbcbb'},
    {tag: [t.function(t.variableName)], color: '#8fbcbb'},
    {tag: [t.labelName], color: '#81a1c1'},
    {
      tag: [t.color, t.constant(t.name), t.standard(t.name)],
      color: '#5e81ac',
    },
    {tag: [t.definition(t.name), t.separator], color: '#a3be8c'},
    {tag: [t.brace], color: '#8fbcbb'},
    {
      tag: [t.annotation],
      color: '#d30102',
    },
    {
      tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
      color: '#b48ead',
    },
    {
      tag: [t.typeName, t.className],
      color: '#ECEFF4',
    },
    {
      tag: [t.operator, t.operatorKeyword],
      color: '#a3be8c',
    },
    {
      tag: [t.tagName],
      color: '#b48ead',
    },
    {
      tag: [t.squareBracket],
      color: '#ECEFF4',
    },
    {
      tag: [t.angleBracket],
      color: '#ECEFF4',
    },
    {
      tag: [t.attributeName],
      color: '#eceff4',
    },
    {
      tag: [t.regexp],
      color: '#5e81ac',
    },
    {
      tag: [t.quote],
      color: '#b48ead',
    },
    {tag: [t.string], color: '#a3be8c'},
    {
      tag: t.link,
      color: '#a3be8c',
      textDecoration: 'underline',
      textUnderlinePosition: 'under',
    },
    {
      tag: [t.url, t.escape, t.special(t.string)],
      color: '#8fbcbb',
    },
    {tag: [t.meta], color: '#88c0d0'},
    {tag: [t.monospace], color: '#d8dee9', fontStyle: 'italic'},
    {tag: [t.comment], color: '#4c566a', fontStyle: 'italic'},
    {tag: t.strong, fontWeight: 'bold', color: '#5e81ac'},
    {tag: t.emphasis, fontStyle: 'italic', color: '#5e81ac'},
    {tag: t.strikethrough, textDecoration: 'line-through'},
    {tag: t.heading, fontWeight: 'bold', color: '#5e81ac'},
    {tag: t.special(t.heading1), fontWeight: 'bold', color: '#5e81ac'},
    {tag: t.heading1, fontWeight: 'bold', color: '#5e81ac'},
    {
      tag: [t.heading2, t.heading3, t.heading4],
      fontWeight: 'bold',
      color: '#5e81ac',
    },
    {
      tag: [t.heading5, t.heading6],
      color: '#5e81ac',
    },
    {tag: [t.atom, t.bool, t.special(t.variableName)], color: '#d08770'},
    {
      tag: [t.processingInstruction, t.inserted],
      color: '#8fbcbb',
    },
    {
      tag: [t.contentSeparator],
      color: '#ebcb8b',
    },
    {tag: t.invalid, color: '#434c5e', borderBottom: `1px dotted #d30102`},
  ]);

  view.add(
    <Code
      style={style}
      ref={c}
      offset={[-1, -1]}
      y={-view.height()}
      dialect="ts"
      code={`import {Shape, ShapeProps, computed, initial, signal} from '@motion-canvas/2d';
import {
  SerializedVector2,
  SignalValue,
  SimpleSignal,
  useLogger,
} from '@motion-canvas/core';
import {highlightTree, tags} from '@lezer/highlight';
import {Parser} from '@lezer/common';
import {parser as jsParser} from '@lezer/javascript';
import {HighlightStyle} from '@codemirror/language';

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
  theme?: SignalValue<Theme>;
  style?: SignalValue<HighlightStyle>;
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

        // Make sure that all of the characters make it into the list, even
        // if they don't make it through the parser. That shouldn't happen,
        // but it's better to be safe than sorry.
        while (tokens.length < to) {
          tokens.push({
            token: this.code().substring(tokens.length, tokens.length + 1),
            color: 'white',
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

  protected draw(context: CanvasRenderingContext2D): void {
    // TODO: Write actual render code that's not pulled from the original
    // CodeBlock component.
    this.requestFontUpdate();
    this.applyStyle(context);
    context.font = this.styles.font;
    context.textBaseline = 'top';
    const lh = parseFloat(this.styles.lineHeight);
    const w = context.measureText('X').width;
    const size = this.computedSize();

    const drawToken = (code: string, position: SerializedVector2) => {
      for (let i = 0; i < code.length; i++) {
        const char = code.charAt(i);
        if (char === '\n') {
          position.y++;
          position.x = 0;
          continue;
        }
        context.fillText(char, position.x * w, position.y * lh);
        position.x++;
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
}`}
    />,
  );
  yield* waitFor(5);

  c().code('// gone');

  yield* waitFor(2);
});
