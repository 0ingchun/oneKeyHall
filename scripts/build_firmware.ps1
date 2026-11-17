param([string]$ArduinoCli = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (!$ArduinoCli) {
    $cliCommand = Get-Command arduino-cli -ErrorAction SilentlyContinue
    if ($cliCommand) { $ArduinoCli = $cliCommand.Source }
    else { $ArduinoCli = Join-Path $env:LOCALAPPDATA 'Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' }
}
if (!(Test-Path -LiteralPath $ArduinoCli)) { throw 'Arduino CLI not found. Pass -ArduinoCli with its executable path.' }
$buildDirectory = Join-Path $projectRoot 'tmp\build-hall'
$outputDirectory = Join-Path $projectRoot 'firmware\build'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
& $ArduinoCli compile --fqbn 'CH55xDuino:mcs51:ch552:clock=24internal,usb_settings=user266' --build-path $buildDirectory (Join-Path $projectRoot 'firmware')
if ($LASTEXITCODE -ne 0) { throw 'Firmware build failed. No firmware was flashed.' }
$hexFile = Join-Path $outputDirectory 'onekeyhall-ch552-24mhz.hex'
Copy-Item -LiteralPath (Join-Path $buildDirectory 'firmware.ino.hex') -Destination $hexFile -Force
Copy-Item -LiteralPath (Join-Path $buildDirectory 'firmware.ino.mem') -Destination (Join-Path $outputDirectory 'memory-usage.txt') -Force
Get-FileHash -LiteralPath $hexFile -Algorithm SHA256
Write-Output 'Build complete. This script does not upload or touch any serial device.'
