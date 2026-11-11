param([string]$Tool = 'npm', [Parameter(ValueFromRemainingArguments=$true)][string[]]$ToolArguments = @('run', 'dev'))
$websiteRoot = Split-Path -Parent $PSScriptRoot
$websiteNode = Join-Path $websiteRoot '.tools\node-v26.13.1-win-x64'
if (Test-Path -LiteralPath (Join-Path $websiteNode 'node.exe')) {
    $env:Path = "$websiteNode;$env:Path"
}
Push-Location $websiteRoot
try { & $Tool @ToolArguments; exit $LASTEXITCODE }
finally { Pop-Location }
