# Secret Scanner for Distributed Payment Platform UI
$ErrorActionPreference = "Stop"

Write-Host "Running repository secret scan..." -ForegroundColor Cyan

$prohibitedFiles = @(".env", ".env.local", ".env.development.local", ".env.test.local", ".env.production.local")
$violations = 0

foreach ($file in $prohibitedFiles) {
    if (Test-Path $file) {
        Write-Error "VIOLATION: Committed environment file detected: $file"
        $violations++
    }
}

$secretPatterns = @(
    "-----BEGIN (RSA|OPENSSH|EC|DSA|PGP|PRIVATE) KEY-----",
    "AKIA[0-9A-Z]{16}",
    "sk_live_[0-9a-zA-Z]{24,}",
    "ghp_[0-9a-zA-Z]{36}",
    "postgres:\/\/[^:]+:[^@]+@",
    "mongodb(\+srv)?:\/\/[^:]+:[^@]+@"
)

$targetFiles = Get-ChildItem -Recurse -File | Where-Object {
    $_.FullName -notmatch "node_modules" -and
    $_.FullName -notmatch "\.next" -and
    $_.FullName -notmatch "\.git" -and
    $_.FullName -notmatch "package-lock\.json"
}

foreach ($pattern in $secretPatterns) {
    $matches = $targetFiles | Select-String -Pattern $pattern
    if ($matches) {
        foreach ($match in $matches) {
            Write-Error "VIOLATION: Potential secret detected in $($match.Filename):$($match.LineNumber)"
            $violations++
        }
    }
}

if ($violations -eq 0) {
    Write-Host "Secret scan passed: zero potential secrets or rogue environment files found." -ForegroundColor Green
    exit 0
} else {
    Write-Error "Secret scan failed with $violations violation(s)."
    exit 1
}
