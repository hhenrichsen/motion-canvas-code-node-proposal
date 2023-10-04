import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {waitFor} from '@motion-canvas/core/lib/flow';
import {Code} from '@components/Code';

export default makeScene2D(function* (view) {
  // Create your animations here
  view.add(<Code />);
  yield* waitFor(5);
});
