Param(
  [string]$Version = "5.0.0"
)

$Url = "https://docs.opencv.org/$Version/opencv.js"
$Out = "vendor/opencv.js"

$dir = Split-Path -Path $Out -Parent
if (-not (Test-Path -Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

Write-Host "Downloading OpenCV.js $Version from $Url ..."
try {
    Invoke-WebRequest -Uri $Url -OutFile $Out -UseBasicParsing
    Write-Host "Saved to $Out"
} catch {
    Write-Error "Failed to download $Url — check network and version. $_"
    exit 1
}
