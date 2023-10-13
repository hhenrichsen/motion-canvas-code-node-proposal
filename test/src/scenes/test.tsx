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
      dialect="ts"
      fallbackColor={'white'}
      fontFamily={'JetBrains Mono'}
      code={`public constructor(props?: CodeProps) {
  // 私🦀です
  super({
    fontFamily: 'monospace',
    ...props,
  });
  const fn = () => { return 5; }
}`}
    />,
  );
  yield* waitFor(5);

  c().code('// gone');

  yield* waitFor(2);
});
