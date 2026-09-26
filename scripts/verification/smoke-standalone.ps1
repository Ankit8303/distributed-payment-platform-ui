# Standalone Runtime Smoke Test Script
$ErrorActionPreference = "Stop"

Write-Host "Verifying production standalone build and smoke testing HTTP endpoint..." -ForegroundColor Cyan

$standaloneDir = ".next/standalone"
if (-not (Test-Path "$standaloneDir/server.js")) {
    Write-Error "ERROR: Standalone build not found. Run 'npm run build' first."
    exit 1
}

# Ensure static and public directories are present in standalone output
if (Test-Path ".next/static") {
    robocopy .next/static "$standaloneDir/.next/static" /E /NFL /NDL /NJH /NJS | Out-Null
}
if (Test-Path "public") {
    robocopy public "$standaloneDir/public" /E /NFL /NDL /NJH /NJS | Out-Null
}

$port = 3099
$env:PORT = $port.ToString()
$env:HOSTNAME = "127.0.0.1"

$process = Start-Process -FilePath "node" -ArgumentList "$standaloneDir/server.js" -PassThru -NoNewWindow

try {
    Write-Host "Waiting for standalone server on port $port..." -ForegroundColor Yellow
    $ready = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                $ready = $true
                break
            }
        } catch {
            # Still starting
        }
    }

    if (-not $ready) {
        Write-Error "ERROR: Standalone server failed to respond with 200 OK within 15 seconds."
        exit 1
    }

    Write-Host "Standalone server smoke test PASSED (HTTP 200 OK)." -ForegroundColor Green
} finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
}
