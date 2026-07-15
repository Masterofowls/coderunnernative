# Activity Log

## 2026-07-15T05:34:00-07:00

- Rebuilt signed release APK (`npm run apk:release`) including input()/async-def fix.
- Output: `dist/CodeRunnerNative-release.apk`.

## 2026-07-15T05:04:00-07:00

- Fixed Python `SyntaxError: 'await' outside async function` when `input()` is
  inside a sync `def`: promote those defs to `async def` and await call sites
  (`asyncifyAwaitingCode` / `prepareUserPython`). Regression tests added.

## 2026-07-15T03:46:00-07:00

- Rebuilt signed release APK via `npm run apk:release` (same local pipeline).
- Output: `dist/CodeRunnerNative-release.apk` (~68 MB), apksigner V2 verified.

## 2026-07-15T03:15:00-07:00


- Fixed JS Run: removed illegal `const eval` / `"use strict"` sandbox bindings
  (Unexpected eval or arguments in strict mode).
- Fixed Python Run: mount engine immediately on CDN (no longer blocked by offline
  cache); deliver run commands via injectJavaScript bridge.

## 2026-07-15T03:12:00-07:00

- Removed non-working floating Run FAB; toolbar Run remains the run control.

## 2026-07-15T03:09:00-07:00

- Saved optimized local signed APK build workflow as skill `expo-signed-apk-build`
  (`.cursor/skills`, `.agents/skills`, and `~/.cursor/skills`), including BOM /
  package-name / CI=1 pitfalls and script pipeline reference.

## 2026-07-15T02:45:00-07:00

- v1.1 product pass: offline CodeMirror vendor + Pyodide runtime cache with
  progress/retry; editor undo/redo/find/keyboard chips/FAB/split; console
  copy/collapse/error jump/stdin history; Python package catalog + import hints +
  timeouts; JS sandbox (no fetch/XHR) + timeouts; projects import/export/share;
  lessons with Check; lazy/warm engines; batched stdout; Maestro smoke stub;
  EAS iOS/AAB profiles; tests for lessons/errors/projects.

## 2026-07-14T19:19:00-07:00

- Updated GitHub release `v1.0.0`: replaced APK (`~71 MB`) and refreshed release notes
  (JS runner + editor UX). https://github.com/Masterofowls/coderunnernative/releases/tag/v1.0.0

## 2026-07-14T19:15:30-07:00

- Rebuilt signed release APK to `dist/CodeRunnerNative-release.apk` (~71 MB; editor + JS runner).

## 2026-07-14T19:15:00-07:00

- Enlarged syntax-highlighted CodeMirror editor; added Clear / Copy / Paste.
- Moved Python micropip + auto-import into Packages submenu.
- Added JavaScript runner with `prompt()` / `input()` stdin bridge.
- Language tabs (Python | JavaScript) with per-language persistence.

## 2026-07-14T19:07:00-07:00

- Created GitHub release `v1.0.0` with `gh release create` and uploaded
  `dist/CodeRunnerNative-release.apk`.
- URL: https://github.com/Masterofowls/coderunnernative/releases/tag/v1.0.0

## 2026-07-14T19:00:00-07:00

- Built signed release APK: `dist/CodeRunnerNative-release.apk` (~70.9 MB).
- Verified with apksigner: CN=CodeRunner Native, package `com.coderunner.python`,
  targetSdk 36 / compileSdk 36 / minSdk 24.
- Fixed invalid package segment `native` (Java keyword) and Gradle UTF-8 BOM
  from PowerShell `Set-Content`.

## 2026-07-14T18:50:00-07:00

- Installed agent skills: vercel-react-native-skills, gradle-build-performance,
  react-native-best-practices, expo-native-ui, expo-ui, expo-react-native-typescript,
  expo-react-native-performance, expo-react-native-coder, expo-dev-client
  (`building-native-ui` unavailable upstream; used `expo-ui`).
- Scaffolded Expo SDK 57 TypeScript app in repo root.
- Implemented Pyodide WebView Python runner with `input()` bridge, micropip,
  auto-import package loading, editor/console UI, examples.
- Added EAS profiles, keystore + signed APK PowerShell scripts, Vitest unit
  tests, architecture docs.
