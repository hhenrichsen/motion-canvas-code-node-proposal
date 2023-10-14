export function correctWhitespace(str: string) {
  const lines = str.split('\n');
  if (lines[0].match(/^\s*$/)) lines.shift();
  if (lines.slice(-1)[0].match(/^\s*$/)) lines.pop();
  const indent = Math.min(
    ...lines.map(line => (line.match(/^\s+/)?.[0] ?? '').length),
  );
  console.log('indent', indent);
  const re = new RegExp(`^${' '.repeat(indent)}`);
  console.log(lines);
  return lines.map(line => line.replace(re, '')).join('\n');
}
