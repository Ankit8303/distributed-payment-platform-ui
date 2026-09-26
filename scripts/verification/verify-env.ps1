# Environment Verification Script
$ErrorActionPreference = "Stop"

Write-Host "Verifying environment configuration..." -ForegroundColor Cyan

if (-not (Test-Path ".env.example")) {
    Write-Error "ERROR: .env.example is missing!"
    exit 1
}

$lines = Get-Content ".env.example"
$violations = 0

foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
        continue
    }
    if (-not $trimmed.StartsWith("NEXT_PUBLIC_")) {
        Write-Error "VIOLATION: Non-public environment variable found in .env.example: $trimmed"
        $violations++
    }
}

if ($violations -eq 0) {
    Write-Host "Environment verification passed: .env.example contains only valid NEXT_PUBLIC_ variables." -ForegroundColor Green
    exit 0
} else {
    Write-Error "Environment verification failed with $violations violation(s)."
    exit 1
}
