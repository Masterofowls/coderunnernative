# Architecture Decision Records

## ADR-001 — Pyodide in WebView for Python execution

- **Status:** Accepted
- **Context:** Need `input()` and real `import` support inside Expo RN.
- **Decision:** Run Pyodide in a hidden WebView with a JSON message bridge.
- **Consequences:** First launch needs network to fetch the runtime CDN; package
  installs need network; pure-Python / Pyodide-built wheels only.

## ADR-002 — Async rewrite for `input()`

- **Status:** Accepted
- **Context:** Sync stdin needs SharedArrayBuffer, unreliable on mobile WebView.
- **Decision:** Lexically rewrite `input(` → `await __rn_input(` and run via
  `runPythonAsync`.
- **Consequences:** Edge-case syntax inside weird embeddings is rare; covered by
  unit tests for strings/comments/identifiers.

## ADR-003 — Local signed APK with committed scripts

- **Status:** Accepted
- **Context:** Need a signed, installable APK without depending on cloud minutes.
- **Decision:** Prebuild + Gradle `assembleRelease` with a local PKCS12 keystore.
- **Consequences:** Keystore passwords live only in gitignored
  `credentials/android/keystore.properties`.
