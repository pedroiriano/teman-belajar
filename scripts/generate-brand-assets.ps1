[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepositoryRoot = Split-Path -Parent $PSScriptRoot

Add-Type -AssemblyName System.Drawing

function Export-BrandPng {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Source,
        [Parameter(Mandatory = $true)]
        [string]$Destination,
        [Parameter(Mandatory = $true)]
        [int]$Size
    )

    $SourcePath = Join-Path $RepositoryRoot $Source
    $DestinationPath = Join-Path $RepositoryRoot $Destination
    $DestinationDirectory = Split-Path -Parent $DestinationPath
    New-Item -ItemType Directory -Force -Path $DestinationDirectory | Out-Null

    $InputImage = [System.Drawing.Image]::FromFile($SourcePath)
    try {
        $OutputImage = New-Object System.Drawing.Bitmap(
            $Size,
            $Size,
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
        )
        try {
            $OutputImage.SetResolution(96, 96)
            $Graphics = [System.Drawing.Graphics]::FromImage($OutputImage)
            try {
                $Graphics.Clear([System.Drawing.Color]::Transparent)
                $Graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $Graphics.DrawImage($InputImage, 0, 0, $Size, $Size)
            }
            finally {
                $Graphics.Dispose()
            }

            $OutputImage.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $OutputImage.Dispose()
        }
    }
    finally {
        $InputImage.Dispose()
    }
}

$Mappings = @(
    @{ Source = "assets/logo-teman-belajar.png"; Name = "logo-main.png"; Size = 512 },
    @{ Source = "assets/logo-teman-belajar-favicon-02.png"; Name = "logo-mark.png"; Size = 256 },
    @{ Source = "assets/logo-teman-belajar-favicon-01.png"; Name = "favicon.png"; Size = 64 },
    @{ Source = "assets/logo-teman-belajar-app-01.png"; Name = "app-icon.png"; Size = 512 }
)

foreach ($Application in @("portal-web", "admin-web")) {
    foreach ($Mapping in $Mappings) {
        Export-BrandPng `
            -Source $Mapping.Source `
            -Destination "apps/$Application/public/brand/$($Mapping.Name)" `
            -Size $Mapping.Size
    }
}

Write-Host "PASS brand assets generated for Portal and Admin."
