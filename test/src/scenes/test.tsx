import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {waitFor} from '@motion-canvas/core/lib/flow';
import {Code} from '@components/Code';
import {createRef} from '@motion-canvas/core';
import {HighlightStyle} from '@codemirror/language';
import {tags as t} from '@lezer/highlight';
import {Txt} from '@motion-canvas/2d';

export default makeScene2D(function* (view) {
  // Create your animations here

  const c = createRef<Code>();
  const txt = createRef<Txt>();

  const materialHighlightStyle = HighlightStyle.define([
    {tag: t.keyword, color: '#cf6edf'},
    {
      tag: [t.name, t.deleted, t.character, t.macroName],
      color: '#56c8d8',
    },
    {tag: [t.propertyName], color: '#facf4e'},
    {tag: [t.variableName], color: '#bdbdbd'},
    {tag: [t.function(t.variableName)], color: '#56c8d8'},
    {tag: [t.labelName], color: '#cf6edf'},
    {
      tag: [t.color, t.constant(t.name), t.standard(t.name)],
      color: '#facf4e',
    },
    {tag: [t.definition(t.name), t.separator], color: '#fa5788'},
    {tag: [t.brace], color: '#cf6edf'},
    {
      tag: [t.annotation],
      color: '#ff5f52',
    },
    {
      tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
      color: '#ffad42',
    },
    {
      tag: [t.typeName, t.className],
      color: '#ffad42',
    },
    {
      tag: [t.operator, t.operatorKeyword],
      color: '#7186f0',
    },
    {
      tag: [t.tagName],
      color: '#99d066',
    },
    {
      tag: [t.squareBracket],
      color: '#ff5f52',
    },
    {
      tag: [t.angleBracket],
      color: '#606f7a',
    },
    {
      tag: [t.attributeName],
      color: '#bdbdbd',
    },
    {
      tag: [t.regexp],
      color: '#ff5f52',
    },
    {
      tag: [t.quote],
      color: '#6abf69',
    },
    {tag: [t.string], color: '#99d066'},
    {
      tag: t.link,
      color: '#56c8d8',
      textDecoration: 'underline',
      textUnderlinePosition: 'under',
    },
    {
      tag: [t.url, t.escape, t.special(t.string)],
      color: '#facf4e',
    },
    {tag: [t.meta], color: '#707d8b'},
    {tag: [t.comment], color: '#707d8b', fontStyle: 'italic'},
    {tag: t.monospace, color: '#bdbdbd'},
    {tag: t.strong, fontWeight: 'bold', color: '#ff5f52'},
    {tag: t.emphasis, fontStyle: 'italic', color: '#99d066'},
    {tag: t.strikethrough, textDecoration: 'line-through'},
    {tag: t.heading, fontWeight: 'bold', color: '#facf4e'},
    {tag: t.heading1, fontWeight: 'bold', color: '#facf4e'},
    {
      tag: [t.heading2, t.heading3, t.heading4],
      fontWeight: 'bold',
      color: '#facf4e',
    },
    {
      tag: [t.heading5, t.heading6],
      color: '#facf4e',
    },
    {tag: [t.atom, t.bool, t.special(t.variableName)], color: '#56c8d8'},
    {
      tag: [t.processingInstruction, t.inserted],
      color: '#ff5f52',
    },
    {
      tag: [t.contentSeparator],
      color: '#56c8d8',
    },
    {tag: t.invalid, color: '#606f7a', borderBottom: `1px dotted #ff5f52`},
  ]);

  const nordHighlightStyle = HighlightStyle.define([
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
    <Txt
      fontSize={48}
      ref={txt}
      text={'Code Block Proposal'}
      y={-view.size().height / 2 + 100}
      fill={'white'}
    />,
  );

  view.add(
    <Code
      style={nordHighlightStyle}
      ref={c}
      dialect="ts"
      x={0}
      y={0}
      fallbackColor={'white'}
      fontFamily={'JetBrains Mono'}
      code={`function hello() {
  console.log('Hello World');
}`}
    />,
  );
  yield* waitFor(3);

  yield txt().text('Code Manipulation', 1);
  yield* c().code(
    `function hello() {
  if (Math.random() > .5) {
    console.log('Hello World');
  } else {
    console.log('Goodbye World');    
  }
}
  `,
    1,
  );

  yield* waitFor(3);

  yield txt().text('CJK and UTF-8 Characters', 1);
  yield* c().code(
    `// 私🦀です
function crab() {
  console.log('🦀')
}`,
    1,
  );

  yield* waitFor(3);

  yield txt().text('Ligatures', 1);
  yield* c().code(
    `const seaLife = () => {
  if (Math.random() >= .5) {
    // 私🦀です
    console.log('🦀');
  }
  else if (Math.random() !== 0) {
    console.log('🐙');
  }
  else {
    console.log('🐟');
  }
}`,
    1,
  );

  yield* waitFor(2);

  yield txt().text('Color Themes', 1);
  yield* c().style(materialHighlightStyle, 1);

  yield* waitFor(2);
});
