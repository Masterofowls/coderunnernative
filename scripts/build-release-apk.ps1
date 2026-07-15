#Requires -Version 5.1
<#
.SYNOPSIS
  Produces a signed release APK via Expo prebuild + Gradle assembleRelease.
  Hardened for Windows Gradle daemon / WinSock bind failures.
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

function Clear-GradleDaemonState {
  Write-Log 'Clearing stale Gradle daemon registry (no gradlew --stop; avoids spawn storms)...'
  $env:GRADLE_OPTS = '-Djava.net.preferIPv4Stack=true'
  $daemonDir = Join-Path $env:USERPROFILE '.gradle\daemon'
  Get-ChildItem $daemonDir -Recurse -Filter 'registry.bin*' -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue
  # Kill only GradleDaemon JVMs if any are stuck
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'java' -and $_.CommandLine -match 'GradleDaemon' } |
    ForEach-Object {
      Write-Log ("Killing GradleDaemon pid={0}" -f $_.ProcessId)
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-AssembleRelease {
  param([string]$AndroidDir, [int]$MaxAttempts = 3)
  $lastError = $null
  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    Clear-GradleDaemonState
    Start-Sleep -Seconds (3 * $attempt)

    Write-Log ("Gradle assembleRelease (attempt {0}/{1})..." -f $attempt, $MaxAttempts)
    Push-Location $AndroidDir
    try {
      & .\gradlew.bat assembleRelease --no-daemon --no-parallel
      if ($LASTEXITCODE -eq 0) { return }
      $lastError = "gradlew exited with code $LASTEXITCODE"
    } catch {
      $lastError = $_.Exception.Message
    } finally {
      Pop-Location
    }

    Write-Log "Gradle failed: $lastError"
    if ($lastError -match 'buffer space|maximum connections|SocketException|Unable to start the daemon|Could not connect to the Gradle daemon') {
      Write-Log 'WinSock/daemon issue — waiting before retry...'
      Start-Sleep -Seconds (8 * $attempt)
    }
  }
  throw @"
Gradle assembleRelease failed after $MaxAttempts attempts.
Last error: $lastError

Windows fix when you see 'No buffer space available... bind':
  1. Close Android Studio / emulators / extra Node processes
  2. android\gradlew.bat --stop
  3. Delete %USERPROFILE%\.gradle\daemon\*\registry.bin*
  4. Wait 60s, retry npm run apk:release
  5. (Admin once) netsh int ipv4 set dynamicport tcp start=10000 num=50000
"@
}

Write-Log 'Generating keystore (noop if exists)...'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'generate-keystore.ps1')

Write-Log 'Expo prebuild android...'
$env:CI = '1'
$env:GRADLE_OPTS = '-Djava.net.preferIPv4Stack=true'
npx expo prebuild --platform android --clean

Write-Log 'Configuring signing...'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'configure-android-signing.ps1')

Write-Log 'Tuning Gradle for Windows...'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'tune-gradle-windows.ps1')

$androidDir = Join-Path $Root 'android'
if (-not (Test-Path (Join-Path $androidDir 'gradlew.bat'))) {
  throw 'gradlew.bat not found after prebuild'
}

Invoke-AssembleRelease -AndroidDir $androidDir

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
