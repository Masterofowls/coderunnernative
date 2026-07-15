import { describe, expect, it } from 'vitest';

import { transformJsInputCalls, wrapJsUserCode } from '../../src/engine/transformJsInput';

describe('transformJsInputCalls', () => {
  it('rewrites prompt and input calls', () => {
    expect(transformJsInputCalls('const x = prompt("?")')).toBe(
      'const x = await __rn_input("?")',
    );
    expect(transformJsInputCalls('const y = input()')).toBe('const y = await __rn_input()');
  });

  it('ignores calls inside strings and comments', () => {
    const src = `// prompt("no")\nconsole.log("input()");\nconst x = prompt("yes")`;
    const out = transformJsInputCalls(src);
    expect(out).toContain('// prompt("no")');
    expect(out).toContain('console.log("input()")');
    expect(out).toContain('await __rn_input("yes")');
  });
});

describe('wrapJsUserCode', () => {
  it('wraps code in async main', () => {
    const wrapped = wrapJsUserCode('console.log(1)');
    expect(wrapped).toContain('async function __user_main()');
    expect(wrapped).toContain('await __user_main()');
    expect(wrapped).not.toContain('"use strict"');
  });
});
