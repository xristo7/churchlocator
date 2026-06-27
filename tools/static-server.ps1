param(
  [string]$Root,
  [string]$Prefix = "http://127.0.0.1:4173/"
)

$ErrorActionPreference = "Stop"

if (-not $Root) {
  $Root = Join-Path (Split-Path -Parent $PSScriptRoot) "public"
}

$resolvedRoot = [System.IO.Path]::GetFullPath($Root)
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($Prefix)
$listener.Start()
Write-Host "Serving $resolvedRoot at $Prefix"

$routeMap = @{
  "owner-dashboard" = "owner-dashboard.html"
  "admin" = "owner-dashboard.html"
  "church-portal" = "church-portal.html"
  "register-church" = "church-portal.html"
  "church-profile" = "church-profile.html"
  "church" = "church-profile.html"
  "livestream" = "livestream.html"
  "live" = "livestream.html"
  "churches" = "index.html"
  "about" = "index.html"
  "donate" = "index.html"
  "volunteer" = "index.html"
  "prayer" = "index.html"
}

function Get-ContentType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8"; break }
    ".css" { "text/css; charset=utf-8"; break }
    ".js" { "application/javascript; charset=utf-8"; break }
    ".json" { "application/json; charset=utf-8"; break }
    ".png" { "image/png"; break }
    ".jpg" { "image/jpeg"; break }
    ".jpeg" { "image/jpeg"; break }
    ".svg" { "image/svg+xml"; break }
    ".ico" { "image/x-icon"; break }
    default { "application/octet-stream" }
  }
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  try {
    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "index.html"
    }

    if ($routeMap.ContainsKey($requestPath)) {
      $requestPath = $routeMap[$requestPath]
    }

    $localPath = [System.IO.Path]::GetFullPath((Join-Path $resolvedRoot $requestPath))
    if (-not $localPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
      $context.Response.StatusCode = 403
      $context.Response.Close()
      continue
    }

    if (-not [System.IO.File]::Exists($localPath)) {
      $localPath = Join-Path $resolvedRoot "index.html"
    }

    $bytes = [System.IO.File]::ReadAllBytes($localPath)
    $context.Response.ContentType = Get-ContentType $localPath
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    $message = [System.Text.Encoding]::UTF8.GetBytes("Server error")
    $context.Response.StatusCode = 500
    $context.Response.ContentLength64 = $message.Length
    $context.Response.OutputStream.Write($message, 0, $message.Length)
  } finally {
    $context.Response.Close()
  }
}
