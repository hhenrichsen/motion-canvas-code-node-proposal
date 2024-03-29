import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {waitFor} from '@motion-canvas/core/lib/flow';
import {Code} from '@components/Code';
import {insert} from '@components/CodeFragment';
import {createRef, DEFAULT} from '@motion-canvas/core';
import {HighlightStyle} from '@codemirror/language';
import {tags as t} from '@lezer/highlight';
import {Txt} from '@motion-canvas/2d';
import {LezerHighlighter} from '@components/LezerHighlighter';
import {CODE} from '@components/CodeScope';
import {lines, word} from '@components/CodeRange';

export default makeScene2D(function* (view) {
  // Create your animations here

  const c = createRef<Code>();
  const txt = createRef<Txt>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  view.add(
    <Txt
      fontSize={48}
      ref={txt}
      text={'Code Block Proposal'}
      y={-view.size().height / 2 + 100}
      fill={'white'}
    />,
  );

  const nested = Code.createSignal(`Hello`);

  view.add(
    <Code
      ref={c}
      dialect="js"
      fill={'white'}
      fontFamily={'JetBrains Mono'}
      code={CODE`function hello() {
  console.log('${nested}');
}`}
    />,
  );

  yield txt().text('Code Selection', 1);
  yield* c().selection(word(1, 14, 7), 1);

  yield txt().text('Code Manipulation', 1);
  yield* nested(`World`, 1);
  yield* waitFor(0.5);
  yield c().selection(word(1, 14, 13), 0.5);
  yield* nested(`Hello World`, 0.5);

  const cached = CODE`function hello() {${insert(`
  if (Math.random() > .5) {`)}
  ${insert(`  `)}console.log('Hello World');${insert(`
  } else {
    console.log('Goodbye World');
  }`)}
}`;

  yield c().selection(lines(1, 5), 1);
  yield c().code.edit(1)`${cached}`;
  yield* c().code.replace(word(1, 10, 3), 'warn', 1);

  yield* waitFor(0.5);
  yield c().selection(DEFAULT, 1);
  yield* c().code.prepend(1)`// 私🦀です\n`;
  yield* waitFor(1);

  yield txt().text('CJK and UTF-8 Characters', 1);
  yield* c().code(
    `
                            // Note that these do not work in GitHub Actions
                            // where this gif is rendered.
                            // 私🦀です
                            function crab() {
                              console.log('🦀')
                            }`,
    1,
  );

  yield* waitFor(1.5);

  yield txt().text('Ligatures', 1);
  yield* c().code(
    `const seaLife = () => {
  if (Math.random() >= .5) {
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
  yield* waitFor(0.5);
  c().highlighter(new LezerHighlighter(materialHighlightStyle));

  yield* waitFor(2);
});
