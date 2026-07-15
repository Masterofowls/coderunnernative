/**
 * Rewrites sync input() calls into await __rn_input() so Pyodide can pause
 * for React Native stdin without SharedArrayBuffer.
 *
 * Nested `def` bodies that gain `await` are promoted to `async def`, and their
 * call sites are rewritten to `await ...` (fixpoint) so Python compiles.
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

/**
 * Promote sync functions that contain `await` to `async def`, then insert
 * `await` at their call sites. Repeats until stable.
 */
export function asyncifyAwaitingCode(source: string): string {
  let current = source;
  for (let round = 0; round < 12; round += 1) {
    const { code: promoted, names } = promoteDefsWithAwait(current);
    const awaited = awaitCallSites(promoted, names);
    if (awaited === current) return awaited;
    current = awaited;
  }
  return current;
}

/** Full transform used by the Python runner. */
export function prepareUserPython(source: string): string {
  return wrapUserCode(asyncifyAwaitingCode(transformInputCalls(source)));
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

interface DefBlock {
  name: string;
  defLine: number;
  bodyStart: number;
  bodyEnd: number;
  indent: number;
  isAsync: boolean;
  defPrefix: string;
}

function promoteDefsWithAwait(source: string): { code: string; names: Set<string> } {
  const lines = source.split('\n');
  const defs = findDefBlocks(lines);
  const names = new Set<string>();
  const promoteLines = new Set<number>();

  for (const def of defs) {
    if (def.isAsync) {
      names.add(def.name);
      continue;
    }
    if (bodyContainsAwait(lines, def, defs)) {
      names.add(def.name);
      promoteLines.add(def.defLine);
    }
  }

  if (promoteLines.size === 0 && names.size === 0) {
    return { code: source, names };
  }

  const out = lines.map((line, idx) => {
    if (!promoteLines.has(idx)) return line;
    return line.replace(/^(\s*)def\b/, '$1async def');
  });

  // Re-scan so already-async names from original source are included.
  for (const def of findDefBlocks(out)) {
    if (def.isAsync) names.add(def.name);
  }

  return { code: out.join('\n'), names };
}

function findDefBlocks(lines: string[]): DefBlock[] {
  const defRe = /^(\s*)(async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
  const blocks: DefBlock[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(defRe);
    if (!m) continue;
    const indent = m[1].length;
    const isAsync = Boolean(m[2]);
    const name = m[3];
    const bodyStart = i + 1;
    let bodyEnd = lines.length;
    for (let j = bodyStart; j < lines.length; j += 1) {
      const line = lines[j];
      if (!line.trim()) continue;
      if (line.trimStart().startsWith('#')) continue;
      const lineIndent = line.match(/^\s*/)?.[0].length ?? 0;
      if (lineIndent <= indent) {
        bodyEnd = j;
        break;
      }
    }
    blocks.push({
      name,
      defLine: i,
      bodyStart,
      bodyEnd,
      indent,
      isAsync,
      defPrefix: m[1] + (m[2] || '') + 'def',
    });
  }
  return blocks;
}

function bodyContainsAwait(lines: string[], def: DefBlock, all: DefBlock[]): boolean {
  const nested = all.filter(
    (other) =>
      other !== def &&
      other.defLine >= def.bodyStart &&
      other.defLine < def.bodyEnd &&
      other.indent > def.indent,
  );

  for (let i = def.bodyStart; i < def.bodyEnd; i += 1) {
    if (nested.some((n) => i >= n.defLine && i < n.bodyEnd)) continue;
    if (lineHasAwaitKeyword(lines[i])) return true;
  }
  return false;
}

function lineHasAwaitKeyword(line: string): boolean {
  // Strip strings/comments coarsely enough for keyword detection.
  const stripped = stripPythonLineLiterals(line);
  return /(^|[^A-Za-z0-9_])await([^A-Za-z0-9_]|$)/.test(stripped);
}

function awaitCallSites(source: string, names: Set<string>): string {
  if (!names.size) return source;
  const sorted = [...names].sort((a, b) => b.length - a.length);
  let out = '';
  let i = 0;
  let state: 'code' | 'squote' | 'dquote' | 'tsquote' | 'tdquote' | 'comment' = 'code';

  while (i < source.length) {
    const ch = source[i];
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

      let matched = false;
      for (const name of sorted) {
        if (!source.startsWith(name, i) || isIdentChar(source[i + name.length])) continue;
        const afterName = skipWhitespace(source, i + name.length);
        if (source[afterName] !== '(') continue;

        // Skip `def name(` / `async def name(`
        const before = out.replace(/\s+$/, '');
        if (/(^|[^A-Za-z0-9_])(async\s+)?def$/.test(before)) {
          break;
        }
        // If call is an attribute (obj.name), insert await before the receiver.
        const insertAt = findAwaitInsertIndex(out);
        const beforeInsert = out.slice(0, insertAt).replace(/\s+$/, '');
        // Skip if already awaited (bare or dotted: await obj.name)
        if (/(^|[^A-Za-z0-9_])await$/.test(beforeInsert)) {
          break;
        }
        out = out.slice(0, insertAt) + 'await ' + out.slice(insertAt);
        out += name;
        i += name.length;
        matched = true;
        break;
      }
      if (matched) continue;

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
    }
  }

  return out;
}

/**
 * If the call is `obj.attr.name(`, return index of `obj`; otherwise return end
 * (await inserts immediately before the function name already being scanned).
 */
function findAwaitInsertIndex(out: string): number {
  // Walk back over a primary: Name (. Name)* with optional whitespace around dots.
  let i = out.length;
  // Trailing whitespace before the name we have not yet appended.
  while (i > 0 && /\s/.test(out[i - 1])) i -= 1;

  // We are about to write the callee name; look behind for `receiver.`
  if (i === 0 || out[i - 1] !== '.') return out.length;

  // Include `receiver.` chain: [Name.]Name.Name
  i -= 1; // dot
  while (true) {
    while (i > 0 && /\s/.test(out[i - 1])) i -= 1;
    if (i === 0 || !isIdentChar(out[i - 1])) break;
    while (i > 0 && isIdentChar(out[i - 1])) i -= 1;
    while (i > 0 && /\s/.test(out[i - 1])) i -= 1;
    if (i > 0 && out[i - 1] === '.') {
      i -= 1;
      continue;
    }
    break;
  }
  return i;
}

function stripPythonLineLiterals(line: string): string {
  let out = '';
  let i = 0;
  let state: 'code' | 's' | 'd' = 'code';
  while (i < line.length) {
    const ch = line[i];
    if (state === 'code') {
      if (ch === '#') break;
      if (ch === "'") {
        state = 's';
        out += ' ';
        i += 1;
        continue;
      }
      if (ch === '"') {
        state = 'd';
        out += ' ';
        i += 1;
        continue;
      }
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '\\' && i + 1 < line.length) {
      i += 2;
      continue;
    }
    if ((state === 's' && ch === "'") || (state === 'd' && ch === '"')) {
      state = 'code';
    }
    i += 1;
  }
  return out;
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
