[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepositoryRoot = Split-Path -Parent $PSScriptRoot

function Require-FileMarker {
    param([string]$RelativePath, [string[]]$Marker)
    $Path = Join-Path $RepositoryRoot $RelativePath
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Missing readiness artifact: $RelativePath"
    }
    $Content = Get-Content -LiteralPath $Path -Raw
    foreach ($Expected in $Marker) {
        if (-not $Content.Contains($Expected)) {
            throw "$RelativePath is missing required marker: $Expected"
        }
    }
}

Require-FileMarker "docs/readiness/TASK-012-PRODUCTION-READINESS.md" @(
    "PRODUCTION HOLD",
    "Human Decision Matrix",
    "AC-10"
)
Require-FileMarker "docs/runbooks/PRODUCTION-RELEASE-GATE.md" @("No agent may approve", "rollback")
Require-FileMarker "docs/runbooks/BACKUP-RESTORE-DRILL.md" @("restore target", "RPO", "RTO")
Require-FileMarker "docs/runbooks/ROLLBACK.md" @("forward-only", "human release owner")
Require-FileMarker "services/portal-api/internal/migrations/runner.go" @(
    "checksum_sha256",
    "ChecksumPolicyStrict",
    "applied migration history is immutable"
)
Require-FileMarker "infrastructure/observability/prometheus/alert.rules" @(
    "API_High_Latency",
    "Event_Inbox_Failed",
    "SSO_Failure_Burst"
)
Require-FileMarker ".github/workflows/security.yml" @(
    "teman-belajar-web:task012",
    "teman-belajar-admin:task012",
    "exit-code: 1"
)

$TrackedPrompt = & git -C $RepositoryRoot ls-files -- "latest_prompt.txt"
if ($LASTEXITCODE -ne 0) {
    throw "git ls-files failed."
}
if ($TrackedPrompt) {
    throw "latest_prompt.txt must never be tracked."
}

$MigrationFiles = @(Get-ChildItem (Join-Path $RepositoryRoot "services/portal-api/migrations") -File -Filter "*.sql" | Sort-Object Name)
if ($MigrationFiles.Count -eq 0) {
    throw "No migration files found."
}
foreach ($Migration in $MigrationFiles) {
    if ($Migration.Name -notmatch '^[0-9]{3}_[a-z0-9_]+\.sql$') {
        throw "Invalid migration filename: $($Migration.Name)"
    }
}
if (($MigrationFiles.Name | Group-Object { $_.Substring(0, 3) } | Where-Object Count -gt 1)) {
    throw "Duplicate migration version prefix detected."
}

Write-Host "PASS TASK-012 static production-readiness guard."
