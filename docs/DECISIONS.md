# Architecture Decision Records

## ADR-001 — Pyodide in WebView for Python execution

- **Status:** Accepted
- **Context:** Need `input()` and real `import` support inside Expo RN.
- **Decision:** Run Pyodide in a hidden WebView with a JSON message bridge.
- **Consequences:** First launch may need network; package installs need network;
  pure-Python / Pyodide-built wheels only.

## ADR-002 — Async rewrite for `input()`

- **Status:** Accepted
- **Context:** Sync stdin needs SharedArrayBuffer, unreliable on mobile WebView.
- **Decision:** Lexically rewrite `input(` → `await __rn_input(` and run via
  `runPythonAsync`.
- **Consequences:** Covered by unit tests for strings/comments/identifiers.

## ADR-003 — Local signed APK with committed scripts

- **Status:** Accepted
- **Context:** Need a signed, installable APK without depending on cloud minutes.
- **Decision:** Prebuild + Gradle `assembleRelease` with a local PKCS12 keystore.
- **Consequences:** Keystore passwords live only in gitignored
  `credentials/android/keystore.properties`.

## ADR-004 — Offline editor + cached Pyodide

- **Status:** Accepted (v1.1)
- **Context:** CDN dependency made cold starts fragile offline.
- **Decision:** Vendor CodeMirror into the JS bundle; download/cache Pyodide core
  files to documentDirectory with progress UI and CDN fallback.
- **Consequences:** First-download cost traded for later offline reliability.

## ADR-005 — Hardened JS sandbox

- **Status:** Accepted (v1.1)
- **Context:** Open WebView JS could call network APIs arbitrarily.
- **Decision:** Disable fetch/XHR/open; wrap user code; enforce timeouts.
- **Consequences:** No free-network JS demos; not a full Wasm isolation box.
