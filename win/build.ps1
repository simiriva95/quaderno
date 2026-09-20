# Costruisce Quaderno.exe e, se c'è Inno Setup, l'installer.
# Il gemello di mac/build.sh: tutto in win\build\.
#
#   win\build.ps1                 costruisce
#   win\build.ps1 -Installa       costruisce e lancia l'installer
#   win\build.ps1 -Versione 1.2.3 costruisce con quel numero

param(
  [switch]$Installa,
  [string]$Versione = '1.0.0'
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

dotnet publish Quaderno.csproj -c Release -o build\app -p:Version=$Versione
# $ErrorActionPreference non vale per i programmi esterni: il codice di uscita
# lo si guarda a mano, o una build fallita prosegue come se niente fosse.
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish non e andato a buon fine' }
Write-Host "fatto: win\build\app\Quaderno.exe"

# ISCC non è nel PATH nemmeno quando Inno c'è: sta dove si installa.
$iscc = @(
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
  "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $iscc) {
  Write-Host 'Inno Setup non c''e'': niente installer.'
  Write-Host 'winget install JRSoftware.InnoSetup'
  return
}

& $iscc /Q "/DVersione=$Versione" quaderno.iss
if ($LASTEXITCODE -ne 0) { throw 'iscc non e andato a buon fine' }
$setup = "build\Quaderno-$Versione-setup.exe"
Write-Host "fatto: win\$setup"

if ($Installa) { Start-Process -Wait $setup }
