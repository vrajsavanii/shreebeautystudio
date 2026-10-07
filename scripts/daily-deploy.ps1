# scripts/daily-deploy.ps1
# Automated 24-Hour Deployment & IndexNow Submission Script
param (
    [string]$ProjectPath = "c:\Users\vrajs\Desktop\Personal\Tech\Shree"
)

$ErrorActionPreference = "Continue"
$Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$LogFile = Join-Path $ProjectPath "daily-deploy.log"

function Write-Log($msg) {
    $line = "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] $msg"
    Write-Output $line
    Add-Content -Path $LogFile -Value $line
}

Write-Log "========== Starting 24-Hour Scheduled Deploy =========="

Set-Location $ProjectPath

# Read token from .env.local
$Token = ""
if (Test-Path ".env.local") {
    $match = Get-Content ".env.local" | Where-Object { $_ -match "^VERCEL_TOKEN=(.+)$" }
    if ($match) {
        $Token = ($match -replace "^VERCEL_TOKEN=", "").Trim()
    }
}

if (-not $Token) {
    $Token = $env:VERCEL_TOKEN
}

if (-not $Token) {
    Write-Log "ERROR: VERCEL_TOKEN not found in .env.local or environment variables!"
    exit 1
}

# 1. Pull latest git changes
Write-Log "Pulling latest changes from git..."
git pull origin main 2>&1 | Out-String | ForEach-Object { Write-Log $_ }

# 2. Deploy to Vercel production
Write-Log "Deploying to Vercel Production..."
$deployOutput = npx vercel --token $Token --prod --yes 2>&1 | Out-String
Write-Log $deployOutput

# 3. Trigger IndexNow search engine ingestion
Write-Log "Pinging IndexNow network for live URL indexation..."
try {
    $res = Invoke-RestMethod -Uri "https://shreebeauty.studio/api/seo/indexnow" -Method Get
    Write-Log "IndexNow Response: Success=$($res.success) Status=$($res.status) Submitted=$($res.submittedUrlsCount)"
} catch {
    Write-Log "IndexNow ping failed: $_"
}

Write-Log "========== 24-Hour Deploy Finished Successfully =========="
