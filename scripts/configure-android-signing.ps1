#Requires -Version 5.1
<#
.SYNOPSIS
  Injects release signing into the Expo prebuild android/ project (idempotent).
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$CredDir = Join-Path $Root 'credentials\android'
$PropsSrc = Join-Path $CredDir 'keystore.properties'
$KeystoreSrc = Join-Path $CredDir 'release.keystore'
$AndroidApp = Join-Path $Root 'android\app'
$GradleProps = Join-Path $AndroidApp 'keystore.properties'
$BuildGradle = Join-Path $AndroidApp 'build.gradle'

if (-not (Test-Path $PropsSrc)) {
  throw "Missing $PropsSrc - run scripts/generate-keystore.ps1 first."
}
if (-not (Test-Path $KeystoreSrc)) {
  throw "Missing $KeystoreSrc - run scripts/generate-keystore.ps1 first."
}
if (-not (Test-Path $BuildGradle)) {
  throw 'Missing android project. Run: npx expo prebuild --platform android'
}

Copy-Item $PropsSrc $GradleProps -Force
Copy-Item $KeystoreSrc (Join-Path $AndroidApp 'release.keystore') -Force

$gradle = [System.IO.File]::ReadAllText($BuildGradle)
if ($gradle.Length -gt 0 -and [int][char]$gradle[0] -eq 0xFEFF) {
  $gradle = $gradle.Substring(1)
}
$marker = 'CODERUNNER_RELEASE_SIGNING'

if ($gradle -notmatch $marker) {
  $signingBlock = @"

// $marker
def keystorePropertiesFile = rootProject.file("app/keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
"@

  if ($gradle -match 'android\s*\{') {
    $gradle = $gradle -replace 'android\s*\{', "$signingBlock`r`nandroid {"
  } else {
    throw 'Could not locate android { block in build.gradle'
  }

  if ($gradle -match 'signingConfigs\s*\{') {
    $releaseConfig = @"
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
"@
    $gradle = $gradle -replace '(signingConfigs\s*\{)', "`$1`r`n$releaseConfig"
  } else {
    $signingConfigs = @"
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
"@
    $gradle = $gradle -replace '(buildTypes\s*\{)', "$signingConfigs`r`n    `$1"
  }

  if ($gradle -match 'release\s*\{[^}]*signingConfig\s+signingConfigs\.debug') {
    $gradle = $gradle -replace '(release\s*\{[^}]*)signingConfig\s+signingConfigs\.debug', '$1signingConfig signingConfigs.release'
  } elseif ($gradle -match 'release\s*\{') {
    $gradle = $gradle -replace '(release\s*\{)', "`$1`r`n            signingConfig signingConfigs.release"
  }

  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($BuildGradle, $gradle, $utf8NoBom)
  Write-Host "Patched $BuildGradle with release signing."
} else {
  Write-Host 'Signing already configured.'
}
