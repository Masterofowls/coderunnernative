#Requires -Version 5.1
<#
.SYNOPSIS
  Creates a release keystore for signing the Android APK (idempotent).
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$CredDir = Join-Path $Root 'credentials\android'
$Keystore = Join-Path $CredDir 'release.keystore'
$Props = Join-Path $CredDir 'keystore.properties'
$LogDir = Join-Path $env:USERPROFILE '.session-logs'
New-Item -ItemType Directory -Force -Path $CredDir, $LogDir | Out-Null
$LogFile = Join-Path $LogDir ("codegen-keystore-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')

function Write-Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format o), $Message
  Add-Content -Path $LogFile -Value $line
  Write-Host $line
}

if (Test-Path $Keystore) {
  Write-Log "Keystore already exists: $Keystore"
} else {
  $storePass = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
  $keyPass = $storePass
  $alias = 'coderunner'

  Write-Log 'Generating keystore...'
  & keytool -genkeypair `
    -v `
    -storetype PKCS12 `
    -keystore $Keystore `
    -alias $alias `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass $storePass `
    -keypass $keyPass `
    -dname 'CN=CodeRunner Native, OU=Mobile, O=CodeRunner, L=Local, ST=Dev, C=US'

  @"
storeFile=release.keystore
storePassword=$storePass
keyAlias=$alias
keyPassword=$keyPass
"@ | Set-Content -Path $Props -Encoding ASCII

  Write-Log "Wrote $Props (gitignored). Store passwords securely."
}

if (-not (Test-Path $Props)) {
  throw "Missing $Props - restore from your secret store or regenerate keystore."
}

Write-Log 'Done.'
Write-Output $Props
