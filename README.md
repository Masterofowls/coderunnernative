# CodeRunner Native

Expo React Native code runner for **Python** and **JavaScript** (v1.1).

## Highlights

- Offline CodeMirror editor (vendored, no CDN)
- Offline Python runtime cache (downloads once, then file:// boot)
- `input()` / `prompt()` console bridging
- Projects save/load/import/export/share
- Lessons with output checking
- Packages catalog + micropip
- Hardened JS sandbox (no fetch/XHR), run timeouts
- Console copy/collapse, error-line jump, stdin history
- Editor/console split controls and toolbar Run/Stop

## Quick start

```bash
npm install
npm run start
```

First Python launch may download ~50MB into app storage for offline reuse. The editor works offline immediately.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests |
| `npm run embed:codemirror` | Regenerate offline editor assets |
| `npm run apk:release` | Signed Android APK |
| `npm run eas:ios:preview` | iOS preview via EAS |

## Maestro smoke

```bash
maestro test maestro/smoke.yaml
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
