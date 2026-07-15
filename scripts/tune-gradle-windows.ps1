#Requires -Version 5.1
<#
.SYNOPSIS
  Applies Gradle Windows reliability settings after Expo prebuild (idempotent).
  Replaces duplicate property keys so Expo defaults do not win over IPv4 / daemon flags.
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Props = Join-Path $Root 'android\gradle.properties'
if (-not (Test-Path $Props)) {
  throw "Missing $Props - run expo prebuild first."
}

$marker = 'CODERUNNER_GRADLE_WINDOWS_TUNING'
$lines = [System.Collections.Generic.List[string]]::new()
$lines.AddRange([string[]][System.IO.File]::ReadAllLines($Props))

# Drop prior tuning block and conflicting keys we will rewrite.
$out = [System.Collections.Generic.List[string]]::new()
$skipTuning = $false
foreach ($line in $lines) {
  if ($line -match [regex]::Escape($marker)) {
    $skipTuning = $true
    continue
  }
  if ($skipTuning) {
    if ($line -match '^\s*#' -or $line -match '^\s*$' -or
        $line -match '^\s*org\.gradle\.(daemon|parallel|jvmargs)\s*=' -or
        $line -match '^\s*systemProp\.java\.net\.preferIPv4Stack\s*=') {
      continue
    }
    $skipTuning = $false
  }
  if ($line -match '^\s*org\.gradle\.jvmargs\s*=') { continue }
  if ($line -match '^\s*org\.gradle\.parallel\s*=') { continue }
  if ($line -match '^\s*org\.gradle\.daemon\s*=') { continue }
  $out.Add($line)
}

$block = @(
  '',
  "# $marker",
  '# Mitigate Windows WinSock / Gradle daemon bind failures.',
  'org.gradle.daemon=false',
  'org.gradle.parallel=false',
  ('org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8 ' +
   '-Djava.net.preferIPv4Stack=true -Djava.net.preferIPv6Addresses=false'),
  'systemProp.java.net.preferIPv4Stack=true',
  ''
)
$out.AddRange([string[]]$block)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($Props, $out.ToArray(), $utf8NoBom)
Write-Host "Applied Windows Gradle tuning to $Props"
