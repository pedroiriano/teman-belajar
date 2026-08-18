$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$requiredFiles = @(
    "AGENTS.md",
    "GEMINI.md",
    "00-INDEX.md",
    "REPOSITORY-STRUCTURE.md",
    "docs/governance/AI-AGENT-ALIGNMENT.md",
    "docs/governance/SOURCE-OF-TRUTH.md",
    "docs/canonical/12-agentic-development-playbook.md"
)

$failures = [System.Collections.Generic.List[string]]::new()
foreach ($relativePath in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot $relativePath) -PathType Leaf)) {
        $failures.Add("Missing required governance file: $relativePath")
    }
}

if ($failures.Count -eq 0) {
    $gemini = Get-Content -LiteralPath (Join-Path $repositoryRoot "GEMINI.md") -Raw
    foreach ($import in @("@./AGENTS.md", "@./docs/governance/AI-AGENT-ALIGNMENT.md", "@./docs/governance/SOURCE-OF-TRUTH.md")) {
        if (-not $gemini.Contains($import)) { $failures.Add("GEMINI.md is missing canonical import: $import") }
    }

    $agents = Get-Content -LiteralPath (Join-Path $repositoryRoot "AGENTS.md") -Raw
    foreach ($marker in @('Teman Belajar', 'Do not query Moodle database directly', 'Secrets must never be committed', 'Next.js `16.3.0`', 'Docker Local Environment', 'UI Template Governance')) {
        if (-not $agents.Contains($marker)) { $failures.Add("AGENTS.md invariant is missing: $marker") }
    }

    $nested = Get-ChildItem -LiteralPath $repositoryRoot -Filter "GEMINI.md" -File -Recurse |
        Where-Object {
            $_.FullName -ne (Join-Path $repositoryRoot "GEMINI.md") -and
            $_.FullName -notmatch '[\\/](\.git|node_modules|vendor)[\\/]'
        }
    foreach ($file in $nested) { $failures.Add("Nested Gemini policy is forbidden without governance approval: $($file.FullName)") }
}

if ($failures.Count -gt 0) {
    foreach ($failure in $failures) { Write-Error $failure }
    exit 1
}

Write-Output "AI agent governance verification PASS"
