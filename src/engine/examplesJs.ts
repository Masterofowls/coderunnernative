import type { CodeExample } from './examples';

export const JS_EXAMPLES: CodeExample[] = [
  {
    id: 'js-hello',
    title: 'Hello',
    code: `console.log("Hello from CodeRunner Native!");
console.log("JavaScript runtime ready.");
`,
  },
  {
    id: 'js-prompt',
    title: 'prompt()',
    code: `const name = prompt("What is your name? ");
const age = prompt("How old are you? ");
console.log(\`Hi \${name}, you are \${age} years old.\`);
console.log("prompt() works end-to-end.");
`,
  },
  {
    id: 'js-input',
    title: 'input()',
    code: `// Python-style alias also supported
const a = Number(input("First number: "));
const b = Number(input("Second number: "));
console.log("Sum =", a + b);
console.log("Product =", a * b);
`,
  },
  {
    id: 'js-async',
    title: 'Async',
    code: `async function main() {
  const n = Number(await input("How many ticks? "));
  for (let i = 1; i <= n; i++) {
    console.log("tick", i);
  }
  console.log("done");
}

await main();
`,
  },
  {
    id: 'js-json',
    title: 'JSON',
    code: `const payload = {
  pi: Number(Math.PI.toFixed(5)),
  now: new Date().toISOString(),
  values: [1, 2, 3].map((n) => n * n),
};
console.log(JSON.stringify(payload, null, 2));
`,
  },
];
