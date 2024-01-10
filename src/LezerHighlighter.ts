import {CodeHighlighter, HighlightResult} from './CodeHighlighter';
import {highlightTree} from '@lezer/highlight';
import {Parser, SyntaxNode, Tree} from '@lezer/common';
import {parser as jsParser} from '@lezer/javascript';
import {HighlightStyle} from '@codemirror/language';
import {useLogger} from '@motion-canvas/core';

interface LezerCache {
  tree: Tree;
  code: string;
  colorLookup: Map<number, string>;
}

export class LezerHighlighter implements CodeHighlighter<LezerCache | null> {
  private static classRegex = /\.(\S+).*color:([^;]+)/;
  private readonly classLookup = new Map<string, string>();

  public constructor(
    private readonly style: HighlightStyle,
    private readonly parserMap: Map<string, Parser> = new Map([
      ['javascript', jsParser],
      ['js', jsParser],
    ]),
  ) {
    for (const rule of this.style.module.getRules().split('\n')) {
      const match = rule.match(LezerHighlighter.classRegex);
      if (!match) {
        continue;
      }

      const className = match[1];
      const color = match[2].trim();
      this.classLookup.set(className, color);
    }
  }

  public initialize(): boolean {
    return true;
  }

  public prepare(code: string, dialect: string): LezerCache | null {
    const parser = this.parserMap.get(dialect);
    if (!parser) {
      useLogger().warn(`No parser found for dialect: ${dialect}`);
      return null;
    }

    const colorLookup = new Map<number, string>();
    const tree = parser.parse(code);
    highlightTree(tree, this.style, (from, to, classes) => {
      const color = this.classLookup.get(classes);
      if (!color) {
        return;
      }

      const cursor = tree.cursorAt(from, 1);
      do {
        const id = this.getNodeId(cursor.node);
        colorLookup.set(id, color);
      } while (cursor.next() && cursor.to <= to);
    });

    return {
      tree,
      code,
      colorLookup,
    };
  }

  public highlight(index: number, cache: LezerCache | null): HighlightResult {
    if (!cache) {
      return {
        color: null,
        skipAhead: 0,
      };
    }

    const node = cache.tree.resolveInner(index, 1);
    const id = this.getNodeId(node);
    const color = cache.colorLookup.get(id);
    if (color) {
      return {
        color,
        skipAhead: node.to - index,
      };
    }

    let skipAhead = 0;
    if (!node.firstChild) {
      skipAhead = node.to - index;
    }

    return {
      color: null,
      skipAhead,
    };
  }

  private getNodeId(node: SyntaxNode): number {
    // NOTE: They don't want us to know about this property.
    // We need a way to persistently identify nodes and this seems to work.
    // Perhaps it could break if the tree is edited? But we don't do that. Yet.
    return (node as any).index;
  }
}
