import { describe, expect, it } from 'vitest';

import {
  asyncifyAwaitingCode,
  transformInputCalls,
  wrapUserCode,
} from '../../src/engine/transformInput';

describe('transformInputCalls', () => {
  it('rewrites bare input calls', () => {
    expect(transformInputCalls('x = input()')).toBe('x = await __rn_input()');
  });

  it('rewrites prompted input calls', () => {
    expect(transformInputCalls('name = input("Name? ")')).toBe(
      'name = await __rn_input("Name? ")',
    );
  });

  it('ignores input inside strings and comments', () => {
    const src = `# input("no")\nprint("input()")\ns = '''input()'''\nx = input("yes")`;
    const out = transformInputCalls(src);
    expect(out).toContain('# input("no")');
    expect(out).toContain('print("input()")');
    expect(out).toContain("'''input()'''");
    expect(out).toContain('await __rn_input("yes")');
  });

  it('does not rewrite identifiers that contain input', () => {
    expect(transformInputCalls('myinput = 1')).toBe('myinput = 1');
    expect(transformInputCalls('input_data = 2')).toBe('input_data = 2');
  });
});

describe('asyncifyAwaitingCode', () => {
  it('promotes sync def containing await to async def', () => {
    const src = [
      'def ask():',
      '    name = await __rn_input("Name? ")',
      '    return name',
      '',
      'print(ask())',
    ].join('\n');
    const out = asyncifyAwaitingCode(src);
    expect(out).toContain('async def ask():');
    expect(out).toMatch(/print\(\s*await\s+ask\(\s*\)\s*\)/);
    expect(out).not.toMatch(/(?<!async )def ask\(\):/);
  });

  it('promotes callers that invoke async helpers', () => {
    const src = [
      'def ask():',
      '    return await __rn_input("?")',
      '',
      'def main():',
      '    print(ask())',
      '',
      'main()',
    ].join('\n');
    const out = asyncifyAwaitingCode(src);
    expect(out).toContain('async def ask():');
    expect(out).toContain('async def main():');
    expect(out).toContain('print(await ask())');
    expect(out).toContain('await main()');
  });

  it('awaits method-style calls to promoted helpers', () => {
    const src = [
      'class Game:',
      '    def ask(self):',
      '        return await __rn_input("move: ")',
      '',
      'g = Game()',
      'print(g.ask())',
    ].join('\n');
    const out = asyncifyAwaitingCode(src);
    expect(out).toContain('async def ask(self):');
    expect(out).toContain('print(await g.ask())');
  });
});

describe('wrapUserCode', () => {
  it('wraps transformed code in an async main', () => {
    const wrapped = wrapUserCode('x = await __rn_input("?")\nprint(x)');
    expect(wrapped).toContain('async def __user_main():');
    expect(wrapped).toContain('await __user_main()');
    expect(wrapped).toContain('from js import __rn_input');
  });

  it('asyncifies nested input() before wrapping', () => {
    const wrapped = wrapUserCode(
      asyncifyAwaitingCode(
        transformInputCalls('def ask():\n    return input("?")\n\nprint(ask())'),
      ),
    );
    expect(wrapped).toContain('async def ask():');
    expect(wrapped).toContain('await __rn_input');
    expect(wrapped).toContain('print(await ask())');
  });
});
