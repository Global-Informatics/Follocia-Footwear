param(
    [Parameter(Mandatory = $true)]
    [string]$SiteRoot,
    [Parameter(Mandatory = $true)]
    [string]$StaticScriptSource
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath $SiteRoot).Path
if (-not (Test-Path -LiteralPath (Join-Path $root "index.html"))) {
    throw "The target does not look like the Tirupati static site: $root"
}

$assets = Join-Path $root "assets"
$vendor = Join-Path $assets "vendor"
$media = Join-Path $assets "media"
$js = Join-Path $assets "js"
New-Item -ItemType Directory -Force -Path $vendor, $js | Out-Null

$moves = @(
    @{ From = "wp-content\uploads"; To = "assets\media" },
    @{ From = "wp-content\plugins"; To = "assets\vendor\plugins" },
    @{ From = "wp-content\themes"; To = "assets\vendor\themes" },
    @{ From = "wp-content\mu-plugins"; To = "assets\vendor\mu-plugins" },
    @{ From = "wp-includes"; To = "assets\vendor\core" }
)

foreach ($move in $moves) {
    $from = Join-Path $root $move.From
    $to = Join-Path $root $move.To
    if ((Test-Path -LiteralPath $from) -and -not (Test-Path -LiteralPath $to)) {
        Move-Item -LiteralPath $from -Destination $to
    }
}

Copy-Item -LiteralPath $StaticScriptSource -Destination (Join-Path $js "static-site.js") -Force

$replacements = [ordered]@{
    "https://tirupatiglass.com/wp-content/uploads/" = "assets/media/"
    "http://tirupatiglass.com/wp-content/uploads/" = "assets/media/"
    "wp-content/uploads/" = "assets/media/"
    "https://tirupatiglass.com/wp-content/plugins/" = "assets/vendor/plugins/"
    "http://tirupatiglass.com/wp-content/plugins/" = "assets/vendor/plugins/"
    "wp-content/plugins/" = "assets/vendor/plugins/"
    "https://tirupatiglass.com/wp-content/themes/" = "assets/vendor/themes/"
    "http://tirupatiglass.com/wp-content/themes/" = "assets/vendor/themes/"
    "wp-content/themes/" = "assets/vendor/themes/"
    "https://tirupatiglass.com/wp-includes/" = "assets/vendor/core/"
    "http://tirupatiglass.com/wp-includes/" = "assets/vendor/core/"
    "wp-includes/" = "assets/vendor/core/"
    "https:\/\/tirupatiglass.com\/wp-content\/uploads\/" = "assets\/media\/"
    "https:\/\/tirupatiglass.com\/wp-content\/plugins\/" = "assets\/vendor\/plugins\/"
    "https:\/\/tirupatiglass.com\/wp-content\/themes\/" = "assets\/vendor\/themes\/"
    "https:\/\/tirupatiglass.com\/wp-includes\/" = "assets\/vendor\/core\/"
}

$textFiles = Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object {
    $_.Name -match "\.(html|css|js|json)(@.*)?$"
}

foreach ($file in $textFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $updated = $content
    foreach ($pair in $replacements.GetEnumerator()) {
        $updated = $updated.Replace($pair.Key, $pair.Value)
    }

    if ($file.Extension -eq ".html") {
        $updated = [regex]::Replace($updated, "(?is)<link\b[^>]+(?:application/rss\+xml|wp-json|oembed)[^>]*>\s*", "")
        $updated = [regex]::Replace($updated, "(?is)<script\b[^>]+src=['""][^'""]*img1\.wsimg\.com[^'""]*['""][^>]*>\s*</script>\s*", "")
        $updated = [regex]::Replace($updated, "(?is)<script\b[^>]+src=['""][^'""]*assets/vendor/plugins/elementor/assets/js/(?:webpack\.runtime|frontend-modules|frontend)\.min\.js[^'""]*['""][^>]*>\s*</script>\s*", "")
        $updated = [regex]::Replace($updated, "(?is)<script\b[^>]+src=['""][^'""]*assets/vendor/plugins/pro-elements/assets/js/(?:webpack-pro\.runtime|frontend|elements-handlers)\.min\.js[^'""]*['""][^>]*>\s*</script>\s*", "")
        $updated = [regex]::Replace($updated, "(?is)<script\b[^>]+src=['""][^'""]*assets/vendor/plugins/elementskit-lite/widgets/init/assets/js/elementor\.js[^'""]*['""][^>]*>\s*</script>\s*", "")
        if ($updated -notmatch "assets/js/static-site\.js") {
            $updated = $updated -replace "(?i)</body>", "<script src='assets/js/static-site.js'></script>`r`n</body>"
        }
    }

    if ($updated -ne $content) {
        [System.IO.File]::WriteAllText($file.FullName, $updated, [System.Text.UTF8Encoding]::new($false))
    }
}

$oldContent = Join-Path $root "wp-content"
if (Test-Path -LiteralPath $oldContent) {
    $remaining = Get-ChildItem -LiteralPath $oldContent -Force
    if ($remaining.Count -eq 0) {
        Remove-Item -LiteralPath $oldContent
    }
}

Write-Output "Static conversion completed: $root"
