# Architecture — CodeRunner Native

## Overview

CodeRunner Native is an Expo React Native app that runs Python on-device via
**Pyodide** (CPython compiled to WebAssembly) inside a hidden `WebView`.

```
┌────────────────────────────────────────────┐
│ React Native UI                            │
│  Editor · Console · Stdin · micropip bar   │
└─────────────────┬──────────────────────────┘
                  │ postMessage JSON bridge
┌─────────────────▼──────────────────────────┐
│ WebView (Pyodide ${PYODIDE_VERSION})       │
│  stdout/stderr · await __rn_input · micropip│
└────────────────────────────────────────────┘
```

## Why Pyodide

- Real CPython semantics (not a toy JS subset)
- `import` for the Python standard library
- Third-party wheels through `micropip` / `loadPackagesFromImports`
- Works inside Expo without embedding a full native CPython toolchain

`input()` is synchronous in CPython. Android WebViews typically lack
`SharedArrayBuffer`, so the host transforms `input(...)` → `await __rn_input(...)`
and wraps user code in an async `__user_main`.

## Message protocol

Host → Engine: `run`, `stdin`, `install`, `interrupt`, `ping`  
Engine → Host: `ready`, `status`, `stdout`, `stderr`, `input_request`, `done`, `error`, `packages`

Validated on the RN side with Zod (`src/engine/protocol.ts`).

## Android release

Signed APKs are produced locally:

1. `scripts/generate-keystore.ps1` — PKCS12 keystore (gitignored)
2. `npx expo prebuild --platform android`
3. `scripts/configure-android-signing.ps1` — wires Gradle release signing
4. `gradlew assembleRelease` → `dist/CodeRunnerNative-release.apk`

EAS profiles in `eas.json` also support cloud / local APK builds.
