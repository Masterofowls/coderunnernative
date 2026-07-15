export interface CodeExample {
  id: string;
  title: string;
  code: string;
}

export const EXAMPLES: CodeExample[] = [
  {
    id: 'hello',
    title: 'Hello',
    code: `print("Hello from CodeRunner Native!")
print("Python is ready.")
`,
  },
  {
    id: 'input',
    title: 'Input()',
    code: `name = input("What is your name? ")
age = input("How old are you? ")
print(f"Hi {name}, you are {age} years old.")
print("input() works end-to-end.")
`,
  },
  {
    id: 'stdlib',
    title: 'Stdlib',
    code: `import math
import json
from datetime import datetime

payload = {
    "pi": round(math.pi, 5),
    "sqrt2": round(math.sqrt(2), 5),
    "now": datetime.utcnow().isoformat() + "Z",
}
print(json.dumps(payload, indent=2))
`,
  },
  {
    id: 'numpy',
    title: 'NumPy',
    code: `import numpy as np

a = np.array([1, 2, 3, 4, 5], dtype=float)
print("array:", a)
print("mean:", a.mean())
print("std:", round(float(a.std()), 4))
print("matmul:", a @ a)
`,
  },
  {
    id: 'loop-input',
    title: 'Loop + Input',
    code: `total = 0
count = int(input("How many numbers? "))
for i in range(count):
    value = float(input(f"Number {i + 1}: "))
    total += value
print(f"Sum = {total}")
print(f"Average = {total / count if count else 0}")
`,
  },
];
