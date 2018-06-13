
$ErrorActionPreference = "Stop"
$scriptPath = $Script:MyInvocation.MyCommand.Path
if ($scriptPath) {
    $thisDir = Split-Path $scriptPath
} else {
    $thisDir = $PWD
}

$ghostInfo = & yarn '-s' '--json' 'info' 'ghost@latest' | `
    ConvertFrom-Json
# if ($LASTEXITCODE -ne 0) {
#     Write-Error "Cannot run 'yarn' command. Install with 'npm install -g yarn' if not yet installed."
# }

Write-Host "Downloading latest release $latestVersion of ghost..."
$latestVersion = $ghostInfo.data.'dist-tags'.latest
$latestZipUrl = "https://github.com/TryGhost/Ghost/releases/download/$latestVersion/Ghost-$latestVersion.zip"
$ghostZip = "$env:USERPROFILE\Downloads\ghost.zip"
(New-Object System.Net.WebClient).DownloadFile($latestZipUrl, $ghostZip)

Write-Host "Unzipping app into local folder..."
$ghostDir = "$thisDir\app"
Remove-Item -Recurse -Force $ghostDir
New-Item -ItemType Directory -Force -Path $ghostDir
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($ghostZip, $ghostDir)

Write-Host "yarn install app dependencies..."
Push-Location $ghostDir
# & yarn 'install' '--no-progress' '--silent' '--production'
& yarn 'install' '--production'
Pop-Location
