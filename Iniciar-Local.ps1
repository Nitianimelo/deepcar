#requires -Version 5.1
# Sobe o Deepcar local: front (Vite) + acervo servido de E:\deepcar-publicacao em /acervo.
# Uso: clique direito > Executar com PowerShell, ou:  powershell -ExecutionPolicy Bypass -File E:\deepcar\Iniciar-Local.ps1
# Depois abra http://localhost:5173  (no celular, mesma rede: http://<IP do PC>:5173)
# Para atualizar o acervo depois de gerar paginas novas:  -Exportar
param([switch]$Exportar)
$ErrorActionPreference = 'Stop'
$env:Path = "E:\ferramentas\node;E:\ferramentas\git\cmd;" + $env:Path
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path node_modules)) { npm ci --no-audit --no-fund }
if ($Exportar -or -not (Test-Path 'E:\deepcar-publicacao\catalogo\index.json')) { node scripts/exportar-acervo.mjs }
$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notmatch '^(127|169\.254)\.' } | Select-Object -First 1).IPAddress
Write-Host ''
Write-Host "  Deepcar local:  http://localhost:5173" -ForegroundColor Cyan
if ($ip) { Write-Host "  Celular/tablet: http://${ip}:5173  (mesma rede Wi-Fi)" -ForegroundColor Cyan }
Write-Host '  Login de teste: qualquer e-mail valido + senha com 4 caracteres ou mais'
Write-Host '  Ctrl+C encerra.'
Write-Host ''
npx vite --host --port 5173
