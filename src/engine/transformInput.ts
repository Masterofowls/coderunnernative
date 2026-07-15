/**
 * Rewrites sync input() calls into await __rn_input() so Pyodide can pause
 * for React Native stdin without SharedArrayBuffer.
 */
export function transformInputCalls(source: string): string {
  let out = '';
  let i = 0;
  let state: 'code' | 'squote' | 'dquote' | 'tsquote' | 'tdquote' | 'comment' | 'comment_multi' =
    'code';

  while (i < source.length) {
    const ch = source[i];
    const next2 = source.slice(i, i + 2);
    const next3 = source.slice(i, i + 3);

    if (state === 'code') {
      if (next3 === '"""') {
        state = 'tdquote';
        out += next3;
        i += 3;
        continue;
      }
      if (next3 === "'''") {
        state = 'tsquote';
        out += next3;
        i += 3;
        continue;
      }
      if (ch === '"') {
        state = 'dquote';
        out += ch;
        i += 1;
        continue;
      }
      if (ch === "'") {
        state = 'squote';
        out += ch;
        i += 1;
        continue;
      }
      if (ch === '#') {
        state = 'comment';
        out += ch;
        i += 1;
        continue;
      }

      if (isIdentifierBoundary(out) && source.startsWith('input', i) && !isIdentChar(source[i + 5])) {
        const after = skipWhitespace(source, i + 5);
        if (source[after] === '(') {
          out += 'await __rn_input';
          i += 5;
          continue;
        }
      }

      out += ch;
      i += 1;
      continue;
    }

    if (state === 'comment') {
      out += ch;
      i += 1;
      if (ch === '\n') state = 'code';
      continue;
    }

    if (state === 'dquote') {
      out += ch;
      i += 1;
      if (ch === '\\' && i < source.length) {
        out += source[i];
        i += 1;
      } else if (ch === '"') {
        state = 'code';
      }
      continue;
    }

    if (state === 'squote') {
      out += ch;
      i += 1;
      if (ch === '\\' && i < source.length) {
        out += source[i];
        i += 1;
      } else if (ch === "'") {
        state = 'code';
      }
      continue;
    }

    if (state === 'tdquote') {
      if (next3 === '"""') {
        out += next3;
        i += 3;
        state = 'code';
      } else {
        out += ch;
        i += 1;
      }
      continue;
    }

    if (state === 'tsquote') {
      if (next3 === "'''") {
        out += next3;
        i += 3;
        state = 'code';
      } else {
        out += ch;
        i += 1;
      }
      continue;
    }

    if (state === 'comment_multi') {
      if (next2 === '*/') {
        out += next2;
        i += 2;
        state = 'code';
      } else {
        out += ch;
        i += 1;
      }
    }
  }

  return out;
}

export function wrapUserCode(transformed: string): string {
  const indented = transformed
    .split('\n')
    .map((line) => (line.length ? `    ${line}` : ''))
    .join('\n');

  return `
from js import __rn_input as __rn_input_js

async def __rn_input(prompt=""):
    value = await __rn_input_js(str(prompt))
    return str(value)

async def __user_main():
${indented}

await __user_main()
`.trimStart();
}

function isIdentChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[A-Za-z0-9_]/.test(ch);
}

function isIdentifierBoundary(out: string): boolean {
  if (!out.length) return true;
  return !isIdentChar(out[out.length - 1]);
}

function skipWhitespace(source: string, index: number): number {
  let i = index;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  return i;
}
