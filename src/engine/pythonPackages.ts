export const PYTHON_PACKAGE_CATALOG: { name: string; hint: string }[] = [
  { name: 'numpy', hint: 'Arrays & linear algebra' },
  { name: 'pandas', hint: 'DataFrames' },
  { name: 'matplotlib', hint: 'Plotting' },
  { name: 'scipy', hint: 'Scientific computing' },
  { name: 'scikit-learn', hint: 'ML (limited)' },
  { name: 'sympy', hint: 'Symbolic math' },
  { name: 'networkx', hint: 'Graph algorithms' },
  { name: 'pillow', hint: 'Image processing' },
  { name: 'regex', hint: 'Advanced regex' },
  { name: 'pytz', hint: 'Timezones' },
  { name: 'beautifulsoup4', hint: 'HTML parsing' },
  { name: 'lxml', hint: 'XML/HTML' },
  { name: 'micropip', hint: 'Package installer (built-in)' },
];

const IMPORT_HINTS: Record<string, string> = {
  cv2: 'OpenCV (cv2) is not available in Pyodide. Try pillow for basic image work.',
  tensorflow: 'TensorFlow is not available in Pyodide. Try numpy / scikit-learn instead.',
  torch: 'PyTorch is not available in Pyodide.',
  django: 'Django is not supported in this sandbox.',
  flask: 'Flask needs a real server; use JS fetch demos instead.',
  requests: 'Use pyodide.http or JS fetch. Try: import pyodide.http',
  sqlite3: 'sqlite3 may be limited; prefer in-memory structures for demos.',
};

export function hintForImportError(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [mod, hint] of Object.entries(IMPORT_HINTS)) {
    if (lower.includes(`no module named '${mod}'`) || lower.includes(`no module named "${mod}"`)) {
      return hint;
    }
  }
  if (lower.includes('no module named')) {
    return 'That package may not have a Pyodide wheel. Open Packages and try micropip, or check the catalog.';
  }
  return null;
}

/** Extract "line N" from Python/JS tracebacks for editor jump. */
export function parseErrorLine(message: string): number | null {
  const patterns = [
    /File "<exec>", line (\d+)/i,
    /line (\d+)/i,
    /:(\d+):\d+/,
    /<anonymous>:(\d+):\d+/,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}
