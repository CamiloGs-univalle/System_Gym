# ============================================================
# Descarga Java 21 (JRE de Eclipse Temurin) dentro de la carpeta "jre"
# para que el instalador de System Gym lo incluya. Así el gimnasio no
# necesita instalar Java por su cuenta.
#
# Uso (una vez, antes de "npm run dist"):
#   npm run preparar-jre
# ============================================================
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root "jre"
$zip  = Join-Path $env:TEMP "systemgym-jre21.zip"
$tmp  = Join-Path $env:TEMP "systemgym-jre21"

if (Test-Path (Join-Path $dest "bin\java.exe")) {
    Write-Host "Java ya está en $dest"
    exit 0
}

$url = "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse"
Write-Host "Descargando Java 21 (Temurin JRE)..."
Invoke-WebRequest -Uri $url -OutFile $zip

if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Expand-Archive -Path $zip -DestinationPath $tmp
$inner = Get-ChildItem $tmp | Select-Object -First 1
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
Move-Item $inner.FullName $dest
Remove-Item $zip -Force
Remove-Item $tmp -Recurse -Force

& (Join-Path $dest "bin\java.exe") -version
Write-Host "Listo: Java 21 quedó en $dest y se incluirá en el instalador."
