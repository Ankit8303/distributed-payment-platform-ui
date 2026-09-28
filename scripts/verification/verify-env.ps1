# Environment Verification Script
# Validates the frontend environment contract against production hardening invariants
$ErrorActionPreference = "Stop"

Write-Host "Verifying environment configuration contract..." -ForegroundColor Cyan

$envExamplePath = ".env.example"
if (-not (Test-Path $envExamplePath)) {
    Write-Error "ERROR: .env.example is missing!"
    exit 1
}

$lines = Get-Content $envExamplePath
$violations = 0
$declaredVariables = @{}
$secretKeywords = @("SECRET", "PASSWORD", "PRIVATE", "KEY", "TOKEN", "DATABASE", "REDIS", "STRIPE_SECRET")

foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
        continue
    }

    # Verify key=value format
    if ($trimmed -match "^([A-Za-z0-9_]+)=(.*)$") {
        $varName = $matches[1]
        $varValue = $matches[2].Trim()
        $declaredVariables[$varName] = $varValue

        # Invariant 1: Only NEXT_PUBLIC_ variables are permitted
        if (-not $varName.StartsWith("NEXT_PUBLIC_")) {
            Write-Error "VIOLATION: Non-public environment variable found in .env.example: $varName"
            $violations++
        }

        # Invariant 2: No secret-like naming under NEXT_PUBLIC_
        foreach ($keyword in $secretKeywords) {
            if ($varName.ToUpper().Contains($keyword)) {
                Write-Error "VIOLATION: Secret-like keyword '$keyword' found in public variable name: $varName"
                $violations++
            }
        }

        # Invariant 3: No default localhost or loopback assigned as production template value
        if ($varValue -match "localhost" -or $varValue -match "127\.0\.0\.1" -or $varValue -match "0\.0\.0\.0") {
            Write-Error "VIOLATION: Default value in .env.example targets localhost/loopback: $trimmed. Production contract must not default to local development address."
            $violations++
        }

        # Invariant 4: No credentials in URL
        if ($varValue -match "://[^@]+@") {
            Write-Error "VIOLATION: Embedded credentials found in variable value: $trimmed"
            $violations++
        }
    } else {
        Write-Error "VIOLATION: Malformed line in .env.example: $trimmed"
        $violations++
    }
}

# Invariant 5: NEXT_PUBLIC_API_URL must be declared
if (-not $declaredVariables.ContainsKey("NEXT_PUBLIC_API_URL")) {
    Write-Error "VIOLATION: Required public variable NEXT_PUBLIC_API_URL is missing from .env.example"
    $violations++
}

# If current environment is explicitly production, validate active NEXT_PUBLIC_API_URL
if ($env:NODE_ENV -eq "production") {
    $prodUrl = $env:NEXT_PUBLIC_API_URL
    if ([string]::IsNullOrWhiteSpace($prodUrl)) {
        Write-Error "VIOLATION: NODE_ENV is set to production but NEXT_PUBLIC_API_URL is missing or empty."
        $violations++
    } elseif (-not $prodUrl.StartsWith("https://")) {
        Write-Error "VIOLATION: Production NEXT_PUBLIC_API_URL must use HTTPS protocol (got: $prodUrl)"
        $violations++
    } elseif ($prodUrl -match "localhost" -or $prodUrl -match "127\.0\.0\.1" -or $prodUrl -match "0\.0\.0\.0") {
        Write-Error "VIOLATION: Production NEXT_PUBLIC_API_URL must not target localhost or loopback (got: $prodUrl)"
        $violations++
    }
}

if ($violations -eq 0) {
    Write-Host "Environment verification PASSED: .env.example complies with production hardening contract." -ForegroundColor Green
    exit 0
} else {
    Write-Error "Environment verification FAILED with $violations violation(s)."
    exit 1
}
