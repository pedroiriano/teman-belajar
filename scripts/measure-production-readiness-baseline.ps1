[CmdletBinding()]
param(
    [string[]]$Target = @(
        "http://127.0.0.1:8080/api/v1/health",
        "http://127.0.0.1:8080/api/v1/news?limit=1",
        "http://127.0.0.1:8080/api/v1/knowledge?limit=1"
    ),
    [ValidateRange(5, 1000)]
    [int]$Requests = 40,
    [ValidateRange(0, 100)]
    [int]$Warmup = 5,
    [ValidateRange(1, 120)]
    [int]$TimeoutSeconds = 10,
    [ValidateRange(1, 60000)]
    [double]$MaximumP95Milliseconds = 750,
    [ValidateRange(0, 100)]
    [double]$MaximumErrorRatePercent = 1,
    [switch]$AllowRemoteTarget
)

$ErrorActionPreference = "Stop"

function Get-Percentile {
    param([double[]]$Values, [double]$Percentile)
    $Sorted = @($Values | Sort-Object)
    $Index = [Math]::Max(0, [Math]::Ceiling($Percentile * $Sorted.Count) - 1)
    return $Sorted[$Index]
}

$Handler = [System.Net.Http.HttpClientHandler]::new()
$Handler.AllowAutoRedirect = $false
$Client = [System.Net.Http.HttpClient]::new($Handler)
$Client.Timeout = [TimeSpan]::FromSeconds($TimeoutSeconds)
$Results = @()

try {
    foreach ($UrlText in $Target) {
        $Uri = [Uri]$UrlText
        if ($Uri.Scheme -notin @("http", "https")) {
            throw "Unsupported target scheme: $($Uri.Scheme)"
        }
        $IsLoopback = $Uri.IsLoopback -or $Uri.Host -in @("localhost", "127.0.0.1", "::1")
        if (-not $IsLoopback -and -not $AllowRemoteTarget) {
            throw "Remote target $UrlText requires -AllowRemoteTarget and separate environment authorization."
        }

        for ($i = 0; $i -lt $Warmup; $i++) {
            $Response = $Client.GetAsync($Uri).GetAwaiter().GetResult()
            $Response.Dispose()
        }

        $Durations = [System.Collections.Generic.List[double]]::new()
        $Errors = 0
        for ($i = 0; $i -lt $Requests; $i++) {
            $Timer = [System.Diagnostics.Stopwatch]::StartNew()
            try {
                $Response = $Client.GetAsync($Uri).GetAwaiter().GetResult()
                if ([int]$Response.StatusCode -lt 200 -or [int]$Response.StatusCode -ge 400) {
                    $Errors++
                }
                $Response.Dispose()
            }
            catch {
                $Errors++
            }
            finally {
                $Timer.Stop()
                $Durations.Add($Timer.Elapsed.TotalMilliseconds)
            }
        }

        $ErrorRate = 100 * $Errors / $Requests
        $P95 = Get-Percentile -Values $Durations.ToArray() -Percentile 0.95
        $Result = [pscustomobject]@{
            target = $UrlText
            requests = $Requests
            errors = $Errors
            error_rate_percent = [Math]::Round($ErrorRate, 2)
            min_ms = [Math]::Round(($Durations | Measure-Object -Minimum).Minimum, 2)
            mean_ms = [Math]::Round(($Durations | Measure-Object -Average).Average, 2)
            p50_ms = [Math]::Round((Get-Percentile -Values $Durations.ToArray() -Percentile 0.50), 2)
            p95_ms = [Math]::Round($P95, 2)
            max_ms = [Math]::Round(($Durations | Measure-Object -Maximum).Maximum, 2)
            threshold_p95_ms = $MaximumP95Milliseconds
            threshold_error_rate_percent = $MaximumErrorRatePercent
            passed = ($P95 -le $MaximumP95Milliseconds -and $ErrorRate -le $MaximumErrorRatePercent)
        }
        $Results += $Result
        $Result | Format-List
    }
}
finally {
    $Client.Dispose()
    $Handler.Dispose()
}

if ($Results.passed -contains $false) {
    throw "Performance baseline failed one or more declared local thresholds."
}

Write-Host "PASS local read-only performance baseline. Remote/staging SLO remains a human release gate."
