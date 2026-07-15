# Activity Log

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
