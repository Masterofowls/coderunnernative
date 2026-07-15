---
name: expo-signed-apk-build
description: >-
  Builds a locally signed Android release APK for Expo/React Native apps using
  prebuild + Gradle assembleRelease (no EAS cloud required). Use when the user
  asks to build an APK, signed APK, release APK, assembleRelease, keystore,
  Android signing, or npm run apk:release.
---

# Expo Signed APK Build (Local, Optimized)

Proven local pipeline for **signed release APKs** on Windows with Expo SDK 57+
and Android SDK. Prefer this over improvising signing or cloud-only builds unless
the user explicitly wants EAS cloud.

## Prerequisites

- Node + npm, Java 17+ (or 21 LTS), Android SDK (`ANDROID_HOME`)
- `keytool` on PATH (JDK)
- Expo project with `expo-dev-client` (or any prebuild-capable app)
- PowerShell 5.1+

## One-command build (this repo)

```powershell
npm run apk:release
```

Output: `dist/CodeRunnerNative-release.apk` (or rename in the script).

Equivalent pipeline:

1. `scripts/generate-keystore.ps1` — idempotent PKCS12 keystore
2. `$env:CI='1'; npx expo prebuild --platform android --clean`
3. `scripts/configure-android-signing.ps1` — patch `android/app/build.gradle`
4. `android/gradlew.bat assembleRelease --no-daemon`
5. Copy APK → `dist/`

## Critical rules (do not skip)

These bit us in production builds — always apply:

| Rule | Why |
|------|-----|
| Use `$env:CI='1'` for prebuild | `--non-interactive` is unsupported on newer Expo CLI |
| Never write `build.gradle` with PowerShell `Set-Content -Encoding UTF8` | Injects BOM → Gradle: `Unexpected character: '﻿'` |
| Write Gradle with UTF-8 **no BOM** | `[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding $false))` |
| Strip BOM before patching if present | Read text, drop U+FEFF, then write |
| Avoid Java keywords in `android.package` | `com.*.native` fails: `'native' is a Java keyword` |
| Release signing must replace `signingConfigs.debug` on release | Otherwise “signed” APK is debug-keyed |
| Gitignore keystore + `keystore.properties` | Never commit secrets |
| Patch after every `--clean` prebuild | Clean wipes `android/`; re-run signing script |

## Package / app config

```ts
// app.config.ts — safe example
android: {
  package: 'com.coderunner.python', // NOT com.something.native
  versionCode: 2,
}
```

## Keystore layout

```
credentials/android/
  release.keystore          # gitignored
  keystore.properties       # gitignored (storeFile, passwords, alias)
  keystore.properties.example
```

`keystore.properties` shape:

```
storeFile=release.keystore
storePassword=...
keyAlias=coderunner
keyPassword=...
```

## Verify after build

```powershell
$apk = 'dist/CodeRunnerNative-release.apk'
$bt = Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\build-tools" -Directory |
  Sort-Object Name -Descending | Select-Object -First 1
& "$($bt.FullName)\apksigner.bat" verify --print-certs $apk
```

Expect your release CN (e.g. `CN=CodeRunner Native`), not the Android debug key.

Install:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r dist\CodeRunnerNative-release.apk
```

## Agent workflow checklist

When the user says “build apk” / “signed apk”:

1. Confirm `scripts/build-release-apk.ps1` exists (or recreate from [reference.md](reference.md))
2. Run `npm run typecheck` / `npm test` if code changed materially
3. Run `npm run apk:release` (long-running; allow 5–15+ minutes)
4. Verify APK path + `apksigner`
5. Optional: `gh release upload <tag> dist/*.apk --clobber`
6. Append `docs/ACTIVITY_LOG.md`

## Do not

- Force-push or amend unless user asks
- Commit `*.keystore` / `keystore.properties`
- Use `signingConfigs.debug` for release distribution
- Rely on Expo Go for production APKs (use prebuild / dev-client)

## EAS alternative

Local Gradle path is default. If user wants cloud/local EAS:

```bash
eas build -p android --profile preview --local
```

Profiles live in `eas.json` (`preview` / `production` → `buildType: apk`).

## Details

Full script templates and Gradle patch notes: [reference.md](reference.md)
