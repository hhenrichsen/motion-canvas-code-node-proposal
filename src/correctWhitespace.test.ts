import {expect, test} from 'vitest';
import {correctWhitespace} from './correctWhitespace';

test('correctWhitespace should remove extra indentation', () => {
  expect(
    correctWhitespace(`
                    function test() {
                      console.log('hello world');
                    }
  `),
  ).toBe(`function test() {
  console.log('hello world');
}`);
});
test('correctWhitespace should not remove indentation if there is no extra indentation', () => {
  expect(
    correctWhitespace(`function test() {
  console.log('hello world');
}`),
  ).toBe(`function test() {
  console.log('hello world');
}`);
});

test('correctWhitespace should leave empty lines alone', () => {
  expect(
    correctWhitespace(`
function test() {
  console.log('hello world');

  console.log('hello world');
}
`),
  ).toBe(`function test() {
  console.log('hello world');

  console.log('hello world');
}`);
});

test('correctWhitespace should remove minimum indentation', () => {
  expect(
    correctWhitespace(`
    function test() {
  console.log('hello world');
    }
    `),
  ).toBe(`  function test() {
console.log('hello world');
  }`);
});
