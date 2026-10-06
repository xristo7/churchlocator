$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$geographyRoot = Join-Path $repoRoot '.wrangler/geography'
New-Item -ItemType Directory -Force -Path $geographyRoot | Out-Null
foreach ($countryCode in @('CA', 'US', 'GB')) {
    $archivePath = Join-Path $geographyRoot "$countryCode.zip"
    Invoke-WebRequest -Uri "https://download.geonames.org/export/dump/$countryCode.zip" -OutFile $archivePath
    Expand-Archive -LiteralPath $archivePath -DestinationPath (Join-Path $geographyRoot $countryCode) -Force
}
node (Join-Path $PSScriptRoot 'build-church-geography.mjs') $geographyRoot
if ($LASTEXITCODE -ne 0) { throw 'Could not build the church city catalog.' }
