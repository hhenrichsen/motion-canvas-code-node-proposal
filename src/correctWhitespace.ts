export function correctWhitespace(str: string) {
  const lines = str.split('\n');
  if (lines[0].match(/^\s*$/)) lines.shift();
  if (lines.slice(-1)[0].match(/^\s*$/)) lines.pop();
  const indent = Math.min(
    ...lines.map(line => (line.match(/^\s+/)?.[0] ?? '').length),
  );
  const re = new RegExp(`^${' '.repeat(indent)}`);
  return lines.map(line => line.replace(re, '')).join('\n');
}
