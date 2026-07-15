/**
 * Rewrites sync prompt()/input() into await __rn_input() for async bridging.
 */
export function transformJsInputCalls(source: string): string {
  let out = '';
  let i = 0;
  let state: 'code' | 'squote' | 'dquote' | 'template' | 'line_comment' | 'block_comment' =
    'code';

  while (i < source.length) {
    const ch = source[i];
    const next2 = source.slice(i, i + 2);

    if (state === 'code') {
      if (next2 === '//') {
        state = 'line_comment';
        out += next2;
        i += 2;
        continue;
      }
      if (next2 === '/*') {
        state = 'block_comment';
        out += next2;
        i += 2;
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
      if (ch === '`') {
        state = 'template';
        out += ch;
        i += 1;
        continue;
      }

      let rewritten = false;
      for (const name of ['prompt', 'input'] as const) {
        if (
          isIdentifierBoundary(out) &&
          source.startsWith(name, i) &&
          !isIdentChar(source[i + name.length])
        ) {
          const after = skipWhitespace(source, i + name.length);
          if (source[after] === '(') {
            out += 'await __rn_input';
            i += name.length;
            rewritten = true;
            break;
          }
        }
      }
      if (rewritten) continue;

      out += ch;
      i += 1;
      continue;
    }

    if (state === 'line_comment') {
      out += ch;
      i += 1;
      if (ch === '\n') state = 'code';
      continue;
    }

    if (state === 'block_comment') {
      if (next2 === '*/') {
        out += next2;
        i += 2;
        state = 'code';
      } else {
        out += ch;
        i += 1;
      }
      continue;
    }

    if (state === 'dquote' || state === 'squote') {
      out += ch;
      i += 1;
      if (ch === '\\' && i < source.length) {
        out += source[i];
        i += 1;
      } else if ((state === 'dquote' && ch === '"') || (state === 'squote' && ch === "'")) {
        state = 'code';
      }
      continue;
    }

    if (state === 'template') {
      out += ch;
      i += 1;
      if (ch === '\\' && i < source.length) {
        out += source[i];
        i += 1;
      } else if (ch === '`') {
        state = 'code';
      }
    }
  }

  return out;
}

export function wrapJsUserCode(transformed: string): string {
  return `
async function __user_main() {
${transformed}
}
await __user_main();
`.trimStart();
}

function isIdentChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[A-Za-z0-9_$]/.test(ch);
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
