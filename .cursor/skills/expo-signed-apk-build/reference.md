# Expo signed APK build — reference

## Script: `scripts/generate-keystore.ps1`

Idempotent. Creates `credentials/android/release.keystore` + `keystore.properties`.

- PKCS12, RSA 2048, 10000-day validity
- Alias default: `coderunner`
- Passwords: random alphanumeric; written ASCII to properties file
- If keystore exists, no-op

## Script: `scripts/configure-android-signing.ps1`

Runs **after** `expo prebuild`. Idempotent via marker `CODERUNNER_RELEASE_SIGNING`.

1. Copy keystore + properties into `android/app/`
2. Read `android/app/build.gradle` (strip BOM if present)
3. Inject Properties loader before `android {`
4. Add `signingConfigs.release` from `keystore.properties`
5. Set `buildTypes.release.signingConfig` → `signingConfigs.release`
6. Write file with **UTF-8 no BOM**

### Fragile spots

- Regex patch assumes Expo’s default Groovy `build.gradle`
- `--clean` prebuild resets android → always re-run this script after prebuild
- Marker prevents double-patching on re-runs without clean

## Script: `scripts/build-release-apk.ps1`

Orchestrator:

```powershell
$ErrorActionPreference = 'Stop'
# 1) generate-keystore.ps1
# 2) $env:CI = '1'; npx expo prebuild --platform android --clean
# 3) configure-android-signing.ps1
# 4) .\android\gradlew.bat assembleRelease --no-daemon
# 5) Copy .../apk/release/*.apk → dist\<Name>-release.apk
```

Log builds to `%USERPROFILE%\.session-logs\build-apk-*.log`.

## package.json

```json
{
  "scripts": {
    "keystore": "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/generate-keystore.ps1",
    "apk:release": "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/build-release-apk.ps1"
  }
}
```

## .gitignore essentials

```
/android
/ios
credentials/android/keystore.properties
credentials/android/*.keystore
credentials/android/*.jks
!credentials/android/keystore.properties.example
*.apk
*.aab
dist/*.apk
```

(Keep `dist/` ignored for binaries if desired; still build into it locally.)

## Known failure → fix map

| Symptom | Fix |
|---------|-----|
| `Namespace '...native' is not a valid Java package name` | Change `android.package` / `applicationId` to avoid keyword `native` |
| `Unexpected character: '﻿'` in build.gradle | Strip BOM; rewrite UTF-8 no BOM |
| `--non-interactive is not supported` | Use `$env:CI='1'` instead |
| Release APK installs as debug / wrong signer | Ensure release `signingConfig signingConfigs.release` |
| Missing APK after Gradle | Check `android/app/build/outputs/apk/release/` and Gradle exit code |
| Prebuild wiped signing | Always run configure script after clean prebuild |
| `No buffer space available… bind` / Unable to start daemon | Windows ephemeral-port exhaustion. Run `gradlew --stop`, wait 30–60s, retry. Script retries 3×. Admin fix: `netsh int ipv4 set dynamicport tcp start=10000 num=50000` |

## Expo SDK note

Validated against **Expo SDK 57**, RN 0.86, Gradle from Expo prebuild (9.x), compile/targetSdk 36, minSdk 24. Re-check `build.gradle` shape if Expo changes the template.
