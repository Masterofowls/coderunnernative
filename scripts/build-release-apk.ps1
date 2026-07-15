#Requires -Version 5.1
<#
.SYNOPSIS
  Produces a signed release APK via Expo prebuild + Gradle assembleRelease.
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$LogDir = Join-Path $env:USERPROFILE '.session-logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogFile = Join-Path $LogDir ("build-apk-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
function Write-Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format o), $Message
  Add-Content -Path $LogFile -Value $line
  Write-Host $line
}

Write-Log 'Generating keystore (noop if exists)...'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'generate-keystore.ps1')

Write-Log 'Expo prebuild android...'
$env:CI = '1'
npx expo prebuild --platform android --clean

Write-Log 'Configuring signing...'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'configure-android-signing.ps1')

Write-Log 'Gradle assembleRelease...'
Push-Location (Join-Path $Root 'android')
try {
  if (Test-Path '.\gradlew.bat') {
    & .\gradlew.bat assembleRelease --no-daemon
  } else {
    throw 'gradlew.bat not found after prebuild'
  }
} finally {
  Pop-Location
}

$apk = Get-ChildItem -Path (Join-Path $Root 'android\app\build\outputs\apk\release') -Filter '*.apk' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $apk) { throw 'Release APK not found' }

$outDir = Join-Path $Root 'dist'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$dest = Join-Path $outDir 'CodeRunnerNative-release.apk'
Copy-Item $apk.FullName $dest -Force
Write-Log "Signed APK: $dest"
Write-Output $dest
