# Architecture — CodeRunner Native

## Overview

CodeRunner Native runs **Python (Pyodide)** and **JavaScript** in hidden WebViews,
with an offline-capable CodeMirror editor embedded in the JS bundle.

```
┌────────────────────────────────────────────────────┐
│ React Native UI                                    │
│ Tabs · Projects · Lessons · Packages · Toolbar Run │
│ Offline editor (CodeMirror vendor) · Console       │
│ Runtime download banner · Stdin history            │
└──────────────┬───────────────────┬─────────────────┘
               │                   │
     ┌─────────▼────────┐   ┌──────▼──────────┐
     │ Pyodide WebView  │   │ JS sandbox WV   │
     │ cache → file://  │   │ no fetch/XHR    │
     │ timeout + batch  │   │ timeout + batch │
     └──────────────────┘   └─────────────────┘
```

## Offline strategy

1. **Editor** — CodeMirror CSS/JS vendored as base64 in `src/vendor/codemirrorEmbedded.ts`
   (regenerate with `npm run embed:codemirror`).
2. **Python** — `ensurePyodideCached()` downloads core Pyodide files to
   `documentDirectory/runtime/pyodide/<version>/` with progress UI, then boots via
   local `indexURL`. Falls back to CDN if download fails.
3. **Packages** — micropip still needs network for new wheels; stdlib works offline
   after core cache completes.

## Safety

- JS: `fetch` / `XMLHttpRequest` / `window.open` blocked; eval/Function shadowed in
  user AsyncFunction wrapper; default 15s timeout.
- Python: default 30s timeout race; import-error hints for common unavailable modules.

## Persistence

- Per-language editor buffers + language tab
- Named projects (`coderunner.projects.v1`)
- Stdin history, split ratio, onboarding flag
