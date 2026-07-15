# CodeRunner Native

Expo React Native code runner for **Python** and **JavaScript** with:

- Syntax-highlighted editor (CodeMirror) with copy / paste / clear
- Full console input: Python `input()`, JS `prompt()` / `input()`
- Python stdlib + micropip packages (Packages submenu)
- Signed Android release APK workflow

## Quick start

```bash
npm install
npm run start
```

First run downloads the Pyodide runtime from jsDelivr (network required).

## Features

| Capability | How |
| --- | --- |
| `print` / stdout / stderr | Pyodide stdout hooks → console panel |
| `input()` | Lexical rewrite → async RN stdin prompt |
| `import math`, etc. | CPython stdlib in Pyodide |
| `import numpy` | `loadPackagesFromImports` + micropip |
| Stop | Interrupt pending stdin / run |

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (input transform) |
| `npm run keystore` | Create release keystore |
| `npm run apk:release` | Prebuild + signed `assembleRelease` |
| `npm run eas:preview:apk` | Optional EAS local APK |

## Signed APK

```powershell
npm run apk:release
```

Output: `dist/CodeRunnerNative-release.apk`

Install:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r dist\CodeRunnerNative-release.apk
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Notes

- Pure-Python and Pyodide-compatible wheels install via micropip.
- Native CPython wheels that are not published for Pyodide will fail to install.
- Runtime CDN load requires `INTERNET` (declared in app config).
