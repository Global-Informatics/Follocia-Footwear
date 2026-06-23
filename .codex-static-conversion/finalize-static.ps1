param(
    [Parameter(Mandatory = $true)]
    [string]$SiteRoot
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath $SiteRoot).Path
if (-not (Test-Path -LiteralPath (Join-Path $root "index.html"))) {
    throw "The target does not look like the Tirupati static site: $root"
}

$htmlFiles = Get-ChildItem -LiteralPath $root -Filter "*.html" -File
foreach ($file in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $updated = $content
    $updated = $updated.Replace("wp-content/mu-plugins/", "assets/vendor/mu-plugins/")
    $updated = $updated.Replace("https:\/\/tirupatiglass.com\/wp-content\/uploads", "assets\/media")
    $updated = $updated.Replace("https://tirupatiglass.com/wp-json/", "./")
    $updated = $updated.Replace("https:\/\/tirupatiglass.com\/wp-json\/", ".\/")
    $updated = $updated.Replace("https://tirupatiglass.com/wp-admin/admin-ajax.php", "contact-mailer.php")
    $updated = $updated.Replace("https:\/\/tirupatiglass.com\/wp-admin\/admin-ajax.php", "contact-mailer.php")
    $updated = [regex]::Replace($updated, "(?is)<script\s+type=['""]speculationrules['""][^>]*>.*?</script>\s*", "")
    $updated = [regex]::Replace($updated, "(?is)<script\b[^>]*>[^<]*img1\.wsimg\.com[^<]*</script>\s*", "")

    if ($updated -ne $content) {
        [System.IO.File]::WriteAllText($file.FullName, $updated, [System.Text.UTF8Encoding]::new($false))
    }
}

$missingMedia = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($file in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    foreach ($match in [regex]::Matches($content, "assets/media/[^`"'()<>\s,]+")) {
        $relative = [System.Net.WebUtility]::HtmlDecode($match.Value).TrimEnd("\", "'")
        $relative = $relative -replace "\\/", "/"
        $local = Join-Path $root ($relative -replace "/", "\")
        if (-not (Test-Path -LiteralPath $local)) {
            [void]$missingMedia.Add($relative)
        }
    }
}

$downloaded = 0
$failed = [System.Collections.Generic.List[string]]::new()
foreach ($relative in $missingMedia) {
    $local = Join-Path $root ($relative -replace "/", "\")
    $directory = Split-Path -Parent $local
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
    $sourcePath = $relative.Substring("assets/media/".Length)
    $url = "https://tirupatiglass.com/wp-content/uploads/$sourcePath"

    & curl.exe -k -L --fail --silent --show-error --max-time 45 --output $local $url
    if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $local) -and (Get-Item -LiteralPath $local).Length -gt 0) {
        $downloaded++
    }
    else {
        if (Test-Path -LiteralPath $local) {
            Remove-Item -LiteralPath $local -Force
        }
        $failed.Add($relative)
    }
}

Write-Output "Missing media found: $($missingMedia.Count)"
Write-Output "Missing media downloaded: $downloaded"
Write-Output "Missing media unavailable: $($failed.Count)"
$failed | Select-Object -First 30
