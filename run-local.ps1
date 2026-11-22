$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root
$portableNode = Join-Path $root '.tools\node\node-v24.22.3-win-x64'
if (Test-Path (Join-Path $portableNode 'node.exe')) {
  $env:PATH = "$portableNode;$env:PATH"
  $node = Join-Path $portableNode 'node.exe'
  $npmCli = Join-Path $portableNode 'node_modules\npm\bin\npm-cli.js'
  if (-not (Test-Path 'node_modules')) { & $node $npmCli install; if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' } }
  & $node $npmCli run dev
} else {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Node.js and npm are required. Install Node.js 20.19+ and retry.' }
  if (-not (Test-Path 'node_modules')) { npm install; if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' } }
  npm run dev
}
