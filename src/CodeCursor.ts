import {
  clampRemap,
  Color,
  map,
  SerializedVector2,
  unwrap,
  Vector2,
} from '@motion-canvas/core';
import {CodeScope, isCodeScope} from '@components/CodeScope';
import {CodeFragment, parseCodeFragment} from '@components/CodeFragment';
import {CodeToken} from '@components/CodeToken';
import {Code} from '@components/Code';

/**
 * A stateful class for recursively traversing a code scope.
 *
 * @internal
 */
export class CodeCursor {
  public cursor = new Vector2();
  public beforeIndex = 0;
  public afterIndex = 0;
  private context: CanvasRenderingContext2D;
  private monoWidth: number;
  private maxWidth: number;
  private lineHeight: number;
  private fallbackFill: Color;
  private caches: {before: unknown; after: unknown} | null;

  public constructor(private readonly node: Code) {}

  /**
   * Prepare the cursor for the next traversal.
   *
   * @param context - The context used to measure and draw the code.
   */
  public reset(context: CanvasRenderingContext2D) {
    this.context = context;
    this.monoWidth = context.measureText('X').width;
    this.lineHeight = parseFloat(this.node.styles.lineHeight);
    this.cursor = new Vector2();
    this.beforeIndex = 0;
    this.afterIndex = 0;
    this.maxWidth = 0;
    this.fallbackFill = this.node.fill() as Color;
    this.caches = this.node.highlighterCache();
  }

  /**
   * Measure the desired size of the code scope.
   *
   * @remarks
   * The result can be retrieved with {@link getSize}.
   *
   * @param scope - The code scope to measure.
   */
  public measureSize(scope: CodeScope) {
    const progress = unwrap(scope.progress);
    for (const wrapped of scope.fragments) {
      const possibleFragment = unwrap(wrapped);
      if (isCodeScope(possibleFragment)) {
        this.measureSize(possibleFragment);
        continue;
      }

      const fragment = parseCodeFragment(
        possibleFragment,
        this.context,
        this.monoWidth,
      );

      const beforeMaxWidth = this.calculateMaxWidth(fragment.before);
      const afterMaxWidth = this.calculateMaxWidth(fragment.after);

      const maxWidth = map(beforeMaxWidth, afterMaxWidth, progress);
      if (maxWidth > this.maxWidth) {
        this.maxWidth = maxWidth;
      }

      const beforeEnd = this.calculateWidth(fragment.before);
      const afterEnd = this.calculateWidth(fragment.after);
      this.cursor.x = map(beforeEnd, afterEnd, progress);

      if (this.cursor.y === 0) {
        this.cursor.y = 1;
      }

      this.cursor.y += map(
        fragment.before.newRows,
        fragment.after.newRows,
        progress,
      );
    }
  }

  /**
   * Get the size measured by the cursor.
   */
  public getSize() {
    return {
      x: this.maxWidth * this.monoWidth,
      y: this.cursor.y * this.lineHeight,
    };
  }

  /**
   * Draw the given code scope.
   *
   * @param scope - The code scope to draw.
   */
  public drawScope(scope: CodeScope) {
    const progress = unwrap(scope.progress);
    for (const wrappedFragment of scope.fragments) {
      const possibleFragment = unwrap(wrappedFragment);
      if (isCodeScope(possibleFragment)) {
        this.drawScope(possibleFragment);
        continue;
      }

      const fragment = parseCodeFragment(
        possibleFragment,
        this.context,
        this.monoWidth,
      );
      const timingOffset = 0.8;
      let alpha = 1;
      let offsetY = 0;
      if (fragment.before.content !== fragment.after.content) {
        const mirrored = Math.abs(progress - 0.5) * 2;
        alpha = clampRemap(1, 1 - timingOffset, 1, 0, mirrored);

        offsetY = map(
          Math.abs(fragment.after.newRows - fragment.before.newRows) / -4,
          0,
          mirrored,
        );
      }

      this.drawToken(fragment, scope, this.cursor.addY(offsetY), alpha);

      this.beforeIndex += fragment.before.content.length;
      this.afterIndex += fragment.after.content.length;

      this.cursor.y += map(
        fragment.before.newRows,
        fragment.after.newRows,
        progress,
      );

      const beforeEnd = this.calculateWidth(fragment.before);
      const afterEnd = this.calculateWidth(fragment.after);
      this.cursor.x = map(beforeEnd, afterEnd, progress);
    }
  }

  private drawToken(
    fragment: CodeFragment,
    scope: CodeScope,
    offset: SerializedVector2,
    alpha: number,
  ) {
    const progress = unwrap(scope.progress);
    const code = progress < 0.5 ? fragment.before : fragment.after;

    this.context.save();
    this.context.globalAlpha *= alpha;
    let offsetX = offset.x;
    let width = 0;
    let y = 0;
    for (let i = 0; i < code.content.length; i++) {
      let char = code.content.charAt(i);
      if (char === '\n') {
        y++;
        offsetX = 0;
        width = 0;
        continue;
      }

      this.context.save();

      const beforeHighlight =
        this.caches &&
        this.node.highlighter?.highlight(
          this.beforeIndex + i,
          this.caches.before,
        );
      const afterHighlight =
        this.caches &&
        this.node.highlighter?.highlight(
          this.afterIndex + i,
          this.caches.after,
        );

      const highlight = progress < 0.5 ? beforeHighlight : afterHighlight;
      if (highlight) {
        // Handle edge cases where the highlight style changes despite the
        // content being the same. The code doesn't fade in and out so the color
        // has to be interpolated to avoid jarring changes.
        if (
          fragment.before.content === fragment.after.content &&
          beforeHighlight.color !== afterHighlight.color
        ) {
          highlight.color = Color.lerp(
            beforeHighlight.color ?? this.fallbackFill,
            afterHighlight.color ?? this.fallbackFill,
            progress,
          ).serialize();
        }

        if (highlight.color) {
          this.context.fillStyle = highlight.color;
        }

        if (highlight.skipAhead > 1) {
          char = code.content.slice(i, i + highlight.skipAhead);
        }

        i += char.length - 1;
      } else {
        while (
          i < code.content.length - 1 &&
          code.content.charAt(i + 1) !== '\n'
        ) {
          char += code.content.charAt(++i);
        }
      }

      this.context.fillText(
        char,
        (offsetX + width) * this.monoWidth,
        (offset.y + y) * this.lineHeight,
      );
      this.context.restore();

      width += Math.round(
        this.context.measureText(char).width / this.monoWidth,
      );
    }
    this.context.restore();
  }

  private calculateWidth(token: CodeToken): number {
    return token.newRows === 0
      ? this.cursor.x + token.lastWidth
      : token.lastWidth;
  }

  private calculateMaxWidth(token: CodeToken): number {
    return Math.max(
      this.maxWidth,
      token.maxWidth,
      this.cursor.x + token.firstWidth,
    );
  }
}
