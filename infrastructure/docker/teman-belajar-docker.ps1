[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("config", "up", "down", "status", "logs", "sso", "moodle-reconcile", "verify")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$DockerDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ComposeFile = Join-Path $DockerDirectory "docker-compose.yml"
$EnvironmentFile = Join-Path $DockerDirectory ".env"

if (-not (Test-Path -LiteralPath $EnvironmentFile)) {
    throw "Missing $EnvironmentFile. Copy .env.example to .env, then replace every CHANGE_ME value."
}

$Environment = @{}
foreach ($Line in Get-Content -LiteralPath $EnvironmentFile) {
    $Trimmed = $Line.Trim()
    if (-not $Trimmed -or $Trimmed.StartsWith("#")) { continue }
    $Pair = $Trimmed.Split("=", 2)
    if ($Pair.Count -eq 2) { $Environment[$Pair[0]] = $Pair[1] }
}

$RequiredKeys = @(
    "TB_BIND_ADDRESS",
    "TB_WEB_PORT", "TB_ADMIN_PORT", "TB_PORTAL_DB_PORT", "TB_MOODLE_DB_PORT",
    "TB_REDIS_PORT", "TB_API_PORT", "TB_KEYCLOAK_PORT", "TB_MOODLE_PORT", "TB_MEILI_PORT",
    "TB_MINIO_API_PORT", "TB_MINIO_CONSOLE_PORT", "TB_GRAFANA_PORT",
    "TB_WEB_URL", "TB_ADMIN_URL", "TB_KEYCLOAK_URL", "TB_MOODLE_URL",
    "TB_MEILI_ENV", "TB_MEILI_INDEX_NAME", "TB_SEARCH_CAPTURE_RAW_QUERY", "TB_FORM_DRAFT_RETENTION_DAYS", "TB_PORTAL_INTERNAL_SECRET", "TB_MOODLE_ALLOW_INSECURE_OAUTH2",
    "TB_PORTAL_DB_NAME", "TB_PORTAL_DB_USER", "TB_PORTAL_DB_PASSWORD",
    "TB_KEYCLOAK_DB_NAME", "TB_KEYCLOAK_DB_USER", "TB_KEYCLOAK_DB_PASSWORD",
    "TB_MOODLE_DB_NAME", "TB_MOODLE_DB_USER", "TB_MOODLE_DB_PASSWORD",
    "TB_REDIS_PASSWORD", "TB_MINIO_ROOT_USER", "TB_MINIO_ROOT_PASSWORD", "TB_MEILI_MASTER_KEY",
    "TB_KEYCLOAK_ADMIN_USER", "TB_KEYCLOAK_ADMIN_PASSWORD",
    "TB_KEYCLOAK_WEB_CLIENT_SECRET", "TB_KEYCLOAK_ADMIN_CLIENT_SECRET",
    "TB_KEYCLOAK_MOODLE_CLIENT_SECRET", "TB_KEYCLOAK_SEED_ADMIN_PASSWORD",
    "TB_KEYCLOAK_SEED_LEARNER_PASSWORD", "TB_MOODLE_ADMIN_USER",
    "TB_MOODLE_ADMIN_PASSWORD", "TB_MOODLE_ADMIN_EMAIL",
    "TB_MOODLE_FEDERATED_ADMIN_USER",
    "TB_SSO_LOGOUT_BRIDGE_SECRET",
    "TB_WEB_NEXTAUTH_SECRET", "TB_ADMIN_NEXTAUTH_SECRET",
    "TB_GRAFANA_ADMIN_USER", "TB_GRAFANA_ADMIN_PASSWORD",
    "TB_KEYCLOAK_MANAGEMENT_CLIENT_SECRET"
)

$Missing = @($RequiredKeys | Where-Object {
    -not $Environment.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($Environment[$_])
})
if ($Missing.Count -gt 0) {
    throw "Missing required .env keys: $($Missing -join ', ')"
}

$Placeholders = @($RequiredKeys | Where-Object { $Environment[$_] -match "CHANGE_ME" })
if ($Placeholders.Count -gt 0) {
    throw "Replace placeholder values for: $($Placeholders -join ', ')"
}

$PortKeys = @(
    "TB_WEB_PORT", "TB_ADMIN_PORT", "TB_PORTAL_DB_PORT", "TB_MOODLE_DB_PORT",
    "TB_REDIS_PORT", "TB_API_PORT", "TB_KEYCLOAK_PORT", "TB_MOODLE_PORT", "TB_MEILI_PORT",
    "TB_MINIO_API_PORT", "TB_MINIO_CONSOLE_PORT", "TB_GRAFANA_PORT"
)
$Ports = foreach ($Key in $PortKeys) {
    $Port = 0
    if (-not [int]::TryParse($Environment[$Key], [ref]$Port) -or $Port -lt 1 -or $Port -gt 65535) {
        throw "$Key must be an integer from 1 through 65535."
    }
    [pscustomobject]@{ Key = $Key; Port = $Port }
}
$DuplicatePorts = @($Ports | Group-Object Port | Where-Object Count -gt 1)
if ($DuplicatePorts.Count -gt 0) {
    $Details = $DuplicatePorts | ForEach-Object {
        "$($_.Name): $(($_.Group.Key) -join ', ')"
    }
    throw "Duplicate host ports detected: $($Details -join '; ')"
}

$DatabaseIdentifierKeys = @(
    "TB_PORTAL_DB_NAME", "TB_PORTAL_DB_USER", "TB_KEYCLOAK_DB_NAME",
    "TB_KEYCLOAK_DB_USER", "TB_MOODLE_DB_NAME", "TB_MOODLE_DB_USER"
)
foreach ($Key in $DatabaseIdentifierKeys) {
    if ($Environment[$Key] -notmatch "^[a-z][a-z0-9_]*$") {
        throw "$Key must be a lowercase PostgreSQL identifier using only letters, digits, and underscores."
    }
}

$DatabasePasswordKeys = @(
    "TB_PORTAL_DB_PASSWORD", "TB_KEYCLOAK_DB_PASSWORD", "TB_MOODLE_DB_PASSWORD"
)
foreach ($Key in $DatabasePasswordKeys) {
    if ($Environment[$Key] -notmatch "^[A-Za-z0-9._~-]+$") {
        throw "$Key must be URL-safe because it is embedded in DATABASE_URL."
    }
}

$UrlPortPairs = @(
    @{ UrlKey = "TB_WEB_URL"; PortKey = "TB_WEB_PORT"; Host = "localhost" },
    @{ UrlKey = "TB_ADMIN_URL"; PortKey = "TB_ADMIN_PORT"; Host = "localhost" },
    @{ UrlKey = "TB_MOODLE_URL"; PortKey = "TB_MOODLE_PORT"; Host = "localhost" },
    @{ UrlKey = "TB_KEYCLOAK_URL"; PortKey = "TB_KEYCLOAK_PORT"; Host = "keycloak.teman-belajar.localhost" }
)
foreach ($Pair in $UrlPortPairs) {
    $Uri = [uri]$Environment[$Pair.UrlKey]
    if ($Uri.Scheme -ne "http" -or $Uri.Host -ne $Pair.Host -or $Uri.Port -ne [int]$Environment[$Pair.PortKey]) {
        throw "$($Pair.UrlKey) must use http://$($Pair.Host):$($Environment[$Pair.PortKey])."
    }
}

if ($Environment["TB_BIND_ADDRESS"] -notin @("127.0.0.1", "::1", "localhost")) {
    throw "TB_BIND_ADDRESS must remain loopback for the governed local environment."
}

if ($Environment["TB_MEILI_ENV"] -ne "development") {
    throw "TB_MEILI_ENV must be development in the governed local environment."
}

if ($Environment["TB_MEILI_INDEX_NAME"] -notmatch "^[a-z][a-z0-9_]*$") {
    throw "TB_MEILI_INDEX_NAME must be a lowercase engine identifier."
}

if ($Environment["TB_SEARCH_CAPTURE_RAW_QUERY"] -ne "false") {
    throw "TB_SEARCH_CAPTURE_RAW_QUERY must remain false; raw search-query capture is prohibited by default."
}

$DraftRetentionDays = 0
if (-not [int]::TryParse($Environment["TB_FORM_DRAFT_RETENTION_DAYS"], [ref]$DraftRetentionDays) -or
    $DraftRetentionDays -lt 1 -or $DraftRetentionDays -gt 365) {
    throw "TB_FORM_DRAFT_RETENTION_DAYS must be an integer from 1 through 365."
}

if ($Environment["TB_MOODLE_ALLOW_INSECURE_OAUTH2"] -notin @("true", "false")) {
    throw "TB_MOODLE_ALLOW_INSECURE_OAUTH2 must be true or false. Production must use false."
}

$MoodleAdminEmail = $Environment["TB_MOODLE_ADMIN_EMAIL"].Trim().ToLowerInvariant()
if ($MoodleAdminEmail -in @("admin@teman-belajar.local", "learner@teman-belajar.local")) {
    throw "TB_MOODLE_ADMIN_EMAIL must be a unique local recovery identity and must not match a Keycloak seed user."
}

$MoodleFederatedAdminUser = $Environment["TB_MOODLE_FEDERATED_ADMIN_USER"].Trim()
if ([string]::IsNullOrWhiteSpace($MoodleFederatedAdminUser) -or
    $MoodleFederatedAdminUser -eq $Environment["TB_MOODLE_ADMIN_USER"].Trim()) {
    throw "TB_MOODLE_FEDERATED_ADMIN_USER must identify a distinct federated Moodle account."
}

$ComposeArguments = @(
    "compose", "--env-file", $EnvironmentFile, "-f", $ComposeFile
)

function Invoke-Compose {
    param([string[]]$Arguments)
    & docker @ComposeArguments @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed with exit code $LASTEXITCODE."
    }
}

Invoke-Compose @("config", "--quiet")

switch ($Action) {
    "config" {
        Invoke-Compose @("config", "--services")
    }
    "up" {
        Invoke-Compose @("up", "-d", "--build", "--remove-orphans", "--wait")
        Invoke-Compose @("exec", "-T", "keycloak", "bash", "/opt/keycloak/data/import/reconcile-sso-clients.sh")
        Invoke-Compose @("ps", "--all")
    }
    "down" {
        # Intentionally excludes --volumes: normal shutdown must preserve all data.
        Invoke-Compose @("down", "--remove-orphans")
    }
    "status" {
        Invoke-Compose @("ps", "--all")
    }
    "logs" {
        Invoke-Compose @("logs", "--tail", "200")
    }
    "sso" {
        Invoke-Compose @("exec", "-T", "keycloak", "bash", "/opt/keycloak/data/import/reconcile-sso-clients.sh")
    }
    "moodle-reconcile" {
        Invoke-Compose @("exec", "-T", "--user", "www-data", "moodle", "php", "/var/www/html/admin/cli/upgrade.php", "--non-interactive")
        Invoke-Compose @("exec", "-T", "--user", "www-data", "moodle", "php", "/var/www/html/public/local/temanbelajar/cli/reconcile_integration.php")
    }
    "verify" {
        if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
            throw "curl.exe is required for endpoint verification."
        }
        Invoke-Compose @("ps", "--all")

        $Checks = @(
            @{ Name = "Portal API"; Url = "http://127.0.0.1:$($Environment['TB_API_PORT'])/api/v1/health" },
            @{ Name = "Portal Web"; Url = "http://127.0.0.1:$($Environment['TB_WEB_PORT'])/" },
            @{ Name = "Admin Web"; Url = "http://127.0.0.1:$($Environment['TB_ADMIN_PORT'])/" },
            @{ Name = "Keycloak"; Url = "$($Environment['TB_KEYCLOAK_URL'])/realms/teman-belajar/.well-known/openid-configuration" },
            @{ Name = "Moodle"; Url = "http://127.0.0.1:$($Environment['TB_MOODLE_PORT'])/" },
            @{ Name = "MinIO"; Url = "http://127.0.0.1:$($Environment['TB_MINIO_API_PORT'])/minio/health/live" },
            @{ Name = "Meilisearch"; Url = "http://127.0.0.1:$($Environment['TB_MEILI_PORT'])/health" },
            @{ Name = "Grafana"; Url = "http://127.0.0.1:$($Environment['TB_GRAFANA_PORT'])/api/health" }
        )

        foreach ($Check in $Checks) {
            $StatusCode = & curl.exe --silent --show-error --location --max-time 15 --output NUL --write-out "%{http_code}" $Check.Url
            if ($LASTEXITCODE -ne 0 -or [int]$StatusCode -lt 200 -or [int]$StatusCode -ge 400) {
                throw "$($Check.Name) returned HTTP $StatusCode."
            }
            Write-Host "PASS $($Check.Name): HTTP $StatusCode"
        }
    }
}
