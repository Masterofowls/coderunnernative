import { describe, expect, it } from 'vitest';

import { transformInputCalls, wrapUserCode } from '../../src/engine/transformInput';

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

describe('wrapUserCode', () => {
  it('wraps transformed code in an async main', () => {
    const wrapped = wrapUserCode('x = await __rn_input("?")\nprint(x)');
    expect(wrapped).toContain('async def __user_main():');
    expect(wrapped).toContain('await __user_main()');
    expect(wrapped).toContain('from js import __rn_input');
  });
});
