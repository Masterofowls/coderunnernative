import type { CodeLanguage } from './language';

export interface Lesson {
  id: string;
  language: CodeLanguage;
  title: string;
  prompt: string;
  starter: string;
  /** Exact trimmed stdout expected (after normalizing newlines). */
  expectedOutput: string;
  hint: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'py-hello',
    language: 'python',
    title: 'Hello print',
    prompt: 'Print exactly: Hello CodeRunner',
    starter: '# Print the required message\n',
    expectedOutput: 'Hello CodeRunner',
    hint: 'Use print("Hello CodeRunner")',
  },
  {
    id: 'py-sum',
    language: 'python',
    title: 'Sum two numbers',
    prompt: 'Read two integers with input() and print their sum.',
    starter: 'a = int(input())\nb = int(input())\n# print the sum\n',
    expectedOutput: '', // interactive — validated softly
    hint: 'print(a + b)',
  },
  {
    id: 'py-loop',
    language: 'python',
    title: 'Loop 1..5',
    prompt: 'Print numbers 1 through 5, each on its own line.',
    starter: 'for i in range(1, 6):\n    pass\n',
    expectedOutput: '1\n2\n3\n4\n5',
    hint: 'print(i) inside the loop',
  },
  {
    id: 'js-hello',
    language: 'javascript',
    title: 'Hello console',
    prompt: 'Log exactly: Hello CodeRunner',
    starter: '// Log the required message\n',
    expectedOutput: 'Hello CodeRunner',
    hint: 'console.log("Hello CodeRunner")',
  },
  {
    id: 'js-double',
    language: 'javascript',
    title: 'Double a number',
    prompt: 'Read a number with prompt() and log n * 2.',
    starter: 'const n = Number(prompt("n: "));\n',
    expectedOutput: '',
    hint: 'console.log(n * 2)',
  },
  {
    id: 'js-map',
    language: 'javascript',
    title: 'Squares array',
    prompt: 'Log JSON of [1,4,9,16,25] (no spaces).',
    starter: 'const nums = [1,2,3,4,5];\n',
    expectedOutput: '[1,4,9,16,25]',
    hint: 'console.log(JSON.stringify(nums.map(n => n*n)))',
  },
];

export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

export function checkLessonOutput(lesson: Lesson, stdout: string): {
  pass: boolean;
  message: string;
} {
  if (!lesson.expectedOutput) {
    return {
      pass: true,
      message: 'Manual check lesson — verify console output matches the prompt.',
    };
  }
  const got = normalizeOutput(stdout);
  const want = normalizeOutput(lesson.expectedOutput);
  if (got === want) {
    return { pass: true, message: 'Lesson passed!' };
  }
  return {
    pass: false,
    message: `Expected:\n${want}\n\nGot:\n${got || '(empty)'}`,
  };
}
