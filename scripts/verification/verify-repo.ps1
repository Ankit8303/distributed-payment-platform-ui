# Repository Hygiene Verification Script
$ErrorActionPreference = "Stop"

Write-Host "Running repository hygiene verification..." -ForegroundColor Cyan

$requiredPaths = @(
    "src/app",
    "src/components",
    "src/features",
    "src/lib",
    "src/hooks",
    "src/types",
    "src/config",
    "src/providers",
    "tests/unit",
    "tests/components",
    "tests/e2e",
    "tests/accessibility",
    "docs/phases",
    "docs/api",
    "docs/adr",
    "package.json",
    "tsconfig.json",
    ".gitignore",
    ".env.example"
)

$missing = 0
foreach ($path in $requiredPaths) {
    if (-not (Test-Path $path)) {
        Write-Error "MISSING REQUIRED PATH: $path"
        $missing++
    }
}

$forbiddenFiles = @(".env", ".env.local", ".env.production", ".DS_Store", "Thumbs.db")
$forbidden = 0
foreach ($file in $forbiddenFiles) {
    if (Test-Path $file) {
        Write-Error "FORBIDDEN LOCAL FILE FOUND: $file"
        $forbidden++
    }
}

if ($missing -eq 0 -and $forbidden -eq 0) {
    Write-Host "Repository hygiene check passed: all required structures present, zero forbidden files." -ForegroundColor Green
    exit 0
} else {
    Write-Error "Repository hygiene check failed."
    exit 1
}
