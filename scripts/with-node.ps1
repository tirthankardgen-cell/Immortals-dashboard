param([Parameter(ValueFromRemainingArguments=$true)][string[]]$CommandArgs)
$websiteRoot = Split-Path -Parent $PSScriptRoot
$websiteNode = Join-Path $websiteRoot '.tools\node-v26.13.1-win-x64'
if (Test-Path -LiteralPath (Join-Path $websiteNode 'node.exe')) {
    $env:Path = "$websiteNode;$env:Path"
}
if (-not $CommandArgs.Count) { $CommandArgs = @('npm', 'run', 'dev') }
$websiteCommand = $CommandArgs[0]
$websiteArguments = if ($CommandArgs.Count -gt 1) { $CommandArgs[1..($CommandArgs.Count-1)] } else { @() }
Push-Location $websiteRoot
try { & $websiteCommand @websiteArguments; exit $LASTEXITCODE }
finally { Pop-Location }
