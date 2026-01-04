# PowerShell script to manually download Gradle 9.0.0
# This script downloads Gradle and places it in the correct cache location

$gradleVersion = "9.0.0"
$gradleUrl = "https://services.gradle.org/distributions/gradle-${gradleVersion}-bin.zip"
$gradleZipName = "gradle-${gradleVersion}-bin.zip"

# Determine Gradle user home directory
# On Windows, it's typically %USERPROFILE%\.gradle
$gradleUserHome = if ($env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME } else { "$env:USERPROFILE\.gradle" }
$gradleCacheDir = Join-Path $gradleUserHome "wrapper\dists\gradle-${gradleVersion}-bin"
$gradleZipPath = Join-Path $gradleCacheDir $gradleZipName

Write-Host "Gradle User Home: $gradleUserHome" -ForegroundColor Cyan
Write-Host "Gradle Cache Directory: $gradleCacheDir" -ForegroundColor Cyan
Write-Host "Download URL: $gradleUrl" -ForegroundColor Cyan
Write-Host ""

# Create cache directory if it doesn't exist
if (-not (Test-Path $gradleCacheDir)) {
    Write-Host "Creating cache directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $gradleCacheDir -Force | Out-Null
}

# Check if Gradle is already downloaded
$expectedExtractedDir = Join-Path $gradleCacheDir "gradle-${gradleVersion}"
if (Test-Path $expectedExtractedDir) {
    Write-Host "Gradle $gradleVersion appears to be already downloaded at:" -ForegroundColor Green
    Write-Host $expectedExtractedDir -ForegroundColor Green
    Write-Host "Skipping download." -ForegroundColor Green
    exit 0
}

# Download Gradle
Write-Host "Downloading Gradle $gradleVersion..." -ForegroundColor Yellow
Write-Host "This may take a few minutes depending on your internet connection..." -ForegroundColor Yellow
Write-Host ""

try {
    # Use Invoke-WebRequest with better error handling
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $gradleUrl -OutFile $gradleZipPath -UseBasicParsing -TimeoutSec 300
    
    if (Test-Path $gradleZipPath) {
        Write-Host "Download completed successfully!" -ForegroundColor Green
        Write-Host "File saved to: $gradleZipPath" -ForegroundColor Green
        Write-Host ""
        Write-Host "Gradle will automatically extract this file on the next build." -ForegroundColor Cyan
        Write-Host "You can now run: npm run android" -ForegroundColor Cyan
    } else {
        Write-Host "Download failed - file not found at expected location." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error downloading Gradle: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative solutions:" -ForegroundColor Yellow
    Write-Host "1. Check your internet connection" -ForegroundColor Yellow
    Write-Host "2. Try using a VPN if the URL is blocked in your region" -ForegroundColor Yellow
    Write-Host "3. Manually download from: $gradleUrl" -ForegroundColor Yellow
    Write-Host "   and place it in: $gradleCacheDir" -ForegroundColor Yellow
    exit 1
}

