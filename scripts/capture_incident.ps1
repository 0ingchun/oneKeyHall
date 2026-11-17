[CmdletBinding()]
param(
    [ValidateSet('Start','Watch','Mark','Stop','Collect','Status','ConfigureDump','RestoreDump')]
    [string]$Action = 'Start',
    [string]$SessionDirectory,
    [string]$Note = 'manual marker',
    [switch]$WithoutUsbTrace,
    [ValidateRange(0,1800)][int]$Seconds = 0,
    [switch]$IncludeMemoryDump
)
$ErrorActionPreference = 'Stop'
$storeRoot = Join-Path $env:LOCALAPPDATA 'OneKeyHallDiagnostics'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

function Write-Durable([string]$Path, $Value, [switch]$Append) {
    $mode = if ($Append) { [IO.FileMode]::Append } else { [IO.FileMode]::Create }
    $bytes = $utf8.GetBytes((ConvertTo-Json -InputObject $Value -Depth 12 -Compress) + "`n")
    $stream = [IO.FileStream]::new($Path, $mode, [IO.FileAccess]::Write, [IO.FileShare]::Read, 4096, [IO.FileOptions]::WriteThrough)
    try { $stream.Write($bytes, 0, $bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
}
function Stamp([string]$Kind, $Data) {
    [ordered]@{utc=[DateTimeOffset]::UtcNow.ToString('o'); local=[DateTimeOffset]::Now.ToString('o'); kind=$Kind; data=$Data}
}
function Run-Native([string]$Exe, [string[]]$Arguments, [string]$OutputPath) {
    $output = & $Exe @Arguments 2>&1
    $code = $LASTEXITCODE
    $output | Out-File -LiteralPath $OutputPath -Encoding utf8 -Append
    if ($code -ne 0) { throw "$Exe exit=$code; see $OutputPath" }
}
function Need-Admin {
    if (!$admin) { throw 'Open PowerShell as Administrator for this action. No automatic elevation is performed.' }
}
function Attempt([string]$Label, [scriptblock]$Work) {
    try { & $Work } catch {
        Write-Durable (Join-Path $SessionDirectory 'errors.jsonl') (Stamp $Label $_.Exception.Message) -Append
        Write-Warning "$Label : $($_.Exception.Message)"
    }
}
function Snapshot([string]$Label) {
    $value = [ordered]@{}
    $value.os = Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber,LastBootUpTime,TotalVisibleMemorySize
    $value.bios = Get-CimInstance Win32_BIOS | Select-Object Manufacturer,SMBIOSBIOSVersion,ReleaseDate
    $value.board = Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product
    $value.crashControl = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\CrashControl' | Select-Object CrashDumpEnabled,AutoReboot,LogEvent,DumpFile,MinidumpDir
    $value.pagefiles = @(Get-CimInstance Win32_PageFileUsage | Select-Object Name,AllocatedBaseSize,CurrentUsage)
    $value.disks = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,FreeSpace,Size)
    $value.drivers = @(Get-CimInstance Win32_PnPSignedDriver | Where-Object { $_.DeviceID -match 'VID_1209&PID_C550|VID_4348&PID_55E0|VID_1A86&PID_55E0' -or $_.DriverProviderName -match 'wch|Qinheng' } | Select-Object DeviceName,DeviceID,DriverVersion,DriverDate,InfName,DriverProviderName)
    $value.processes = @(Get-Process | Where-Object { $_.ProcessName -match 'wch|isp|chrome|msedge' } | Select-Object Id,ProcessName,Path)
    $value.admin = $admin
    $value.timezone = [TimeZoneInfo]::Local.Id
    Write-Durable (Join-Path $SessionDirectory "$Label.json") (Stamp $Label $value)
    $files = @('C:\Windows\System32\drivers\CH375W64.SYS')
    $files += @(Get-ChildItem 'C:\WCH\WCHISPTool' -Filter '*.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
    $files += @((Join-Path $PSScriptRoot '..\firmware\build\onekeyhall-ch552-24mhz.hex'))
    $hashes = foreach ($file in $files) { if (Test-Path -LiteralPath $file) { Get-FileHash -LiteralPath $file -Algorithm SHA256 } }
    Write-Durable (Join-Path $SessionDirectory "$Label-hashes.json") @($hashes)
}
function Resolve-Session {
    if (!$script:SessionDirectory) {
        $last = Get-Content -LiteralPath (Join-Path $storeRoot 'latest.json') -Raw | ConvertFrom-Json
        $script:SessionDirectory = $last.directory
    }
    $script:SessionDirectory = (Resolve-Path -LiteralPath $script:SessionDirectory).Path
    if (!(Test-Path -LiteralPath (Join-Path $SessionDirectory 'session.json'))) { throw 'Not an incident session directory.' }
}
function Stop-Trace($Manifest) {
    if ($Manifest.usbTrace) {
        # This unique session name belongs only to this capture. Never stop other traces.
        $output = & logman query $Manifest.traceName -ets 2>&1
        if ($LASTEXITCODE -eq 0) {
            Run-Native 'logman' @('stop',$Manifest.traceName,'-ets') (Join-Path $SessionDirectory 'logman-stop.txt')
        }
    }
}

New-Item -ItemType Directory -Path $storeRoot -Force | Out-Null
if ($Action -in @('ConfigureDump','RestoreDump')) {
    Need-Admin
    $key = 'HKLM:\SYSTEM\CurrentControlSet\Control\CrashControl'
    $backupFile = Join-Path $storeRoot 'crash-control-before.json'
    $desired = @{AutoReboot=0; CrashDumpEnabled=7; LogEvent=1}
    if ($Action -eq 'ConfigureDump') {
        if (Test-Path -LiteralPath $backupFile) { throw "Backup already exists: $backupFile. Restore first; it will not be overwritten." }
        $registry = Get-Item -LiteralPath $key
        $backup = foreach ($name in $desired.Keys) {
            $exists = $registry.GetValueNames() -contains $name
            [ordered]@{name=$name; exists=$exists; value=$registry.GetValue($name); type=$(if ($exists) {$registry.GetValueKind($name).ToString()} else {'DWord'})}
        }
        Write-Durable $backupFile @($backup)
        foreach ($name in $desired.Keys) { New-ItemProperty -LiteralPath $key -Name $name -Value $desired[$name] -PropertyType DWord -Force | Out-Null }
        Write-Host 'Automatic dump + no automatic restart configured. Save work and restart Windows before capture. Pagefile size was NOT changed.'
    } else {
        $backup = @(Get-Content -LiteralPath $backupFile -Raw | ConvertFrom-Json)
        foreach ($item in $backup) {
            $current = Get-ItemPropertyValue -LiteralPath $key -Name $item.name -ErrorAction SilentlyContinue
            if ($current -ne $desired[$item.name]) { throw "Setting $($item.name) changed since configuration; inspect manually before restoring. Backup retained." }
        }
        foreach ($item in $backup) {
            if ($item.exists) { New-ItemProperty -LiteralPath $key -Name $item.name -Value $item.value -PropertyType $item.type -Force | Out-Null }
            else { Remove-ItemProperty -LiteralPath $key -Name $item.name -ErrorAction SilentlyContinue }
        }
        Move-Item -LiteralPath $backupFile -Destination ($backupFile + '.restored-' + [guid]::NewGuid().ToString('N'))
        Write-Host 'Original crash settings restored. Restart Windows when convenient.'
    }
    return
}

if ($Action -eq 'Start') {
    if (!$WithoutUsbTrace) { Need-Admin }
    $id = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8)
    $SessionDirectory = Join-Path $storeRoot $id
    New-Item -ItemType Directory -Path $SessionDirectory | Out-Null
    $manifest = [ordered]@{id=$id; startedUtc=[DateTimeOffset]::UtcNow.ToString('o'); directory=$SessionDirectory; traceName="OneKeyHall-$id"; usbTrace=$false; ready=$false; ownerPid=$PID}
    Write-Durable (Join-Path $SessionDirectory 'session.json') $manifest
    Write-Durable (Join-Path $storeRoot 'latest.json') @{directory=$SessionDirectory}
    $job = $null
    try {
        Write-Host "Preparing baseline: $SessionDirectory"
        Snapshot 'before'
        if (!$WithoutUsbTrace) {
            $providers = @('Microsoft-Windows-USB-USBXHCI','Microsoft-Windows-USB-UCX','Microsoft-Windows-USB-USBHUB3')
            $providerFile = Join-Path $SessionDirectory 'providers.pf'
            $providerLines = foreach ($provider in $providers) {
                $listing = & logman query providers $provider 2>&1
                $code = $LASTEXITCODE
                $listing | Out-File (Join-Path $SessionDirectory 'providers.txt') -Encoding utf8 -Append
                if ($code -ne 0) { throw "ETW provider unavailable: $provider" }
                $providerText = $listing -join "`n"
                $guid = [regex]::Match($providerText,'\{[0-9A-Fa-f-]{36}\}').Value
                if (!$guid) { throw "Provider GUID missing: $provider" }
                [uint64]$mask = 0
                foreach ($keyword in @('Default','USBError','Power','PnP','StateMachine','Enumeration','Rundown')) {
                    $match = [regex]::Match($providerText,"(?m)^\s*0x([0-9A-Fa-f]+)\s+$keyword\s")
                    if (!$match.Success) { throw "ETW keyword $keyword unavailable for $provider" }
                    $mask = $mask -bor [Convert]::ToUInt64($match.Groups[1].Value,16)
                }
                # Numeric masks in provider files avoid locale/name parsing ambiguity.
                # Explicit bus data payload keywords are not enabled.
                "$guid 0x$($mask.ToString('x')) 0x5"
            }
            [IO.File]::WriteAllLines($providerFile, [string[]]$providerLines, [Text.Encoding]::ASCII)
            Run-Native 'logman' @('create','trace',$manifest.traceName,'-o',(Join-Path $SessionDirectory 'usb.etl'),'-f','bincirc','-max','256','-bs','64','-nb','16','64','-ft','00:00:01','-pf',$providerFile,'-ets') (Join-Path $SessionDirectory 'logman-start.txt')
            $manifest.usbTrace = $true
            Write-Durable (Join-Path $SessionDirectory 'session.json') $manifest
        }
        $job = Start-Job -ScriptBlock { param($file,$dir) & $file -Action Watch -SessionDirectory $dir } -ArgumentList $PSCommandPath,$SessionDirectory
        $clock = [Diagnostics.Stopwatch]::StartNew()
        $manifest.ready = $true
        Write-Durable (Join-Path $SessionDirectory 'session.json') $manifest
        Write-Durable (Join-Path $SessionDirectory 'timeline.jsonl') (Stamp 'ready' @{usbTrace=$manifest.usbTrace}) -Append
        Write-Host "READY USB_TRACE=$($manifest.usbTrace). Film this clock and the laptop power LED. No hardware commands are sent."
        Write-Host 'Keys: 1=before USB connection, 2=before opening ISP tool, 3=before manual trigger, 4=survived, S=stop.'
        Write-Host 'A marker only records intent; it does NOT execute that operation. Automatic stop after 30 minutes.'
        $limit = if ($Seconds) { $Seconds } else { 1800 }
        $lastBeat = -1
        while ($clock.Elapsed.TotalSeconds -lt $limit -and !(Test-Path -LiteralPath (Join-Path $SessionDirectory 'stop.request'))) {
            $second = [int][Math]::Floor($clock.Elapsed.TotalSeconds)
            if ($second -ne $lastBeat) {
                $lastBeat = $second
                Write-Durable (Join-Path $SessionDirectory 'timeline.jsonl') (Stamp 'heartbeat' @{elapsedMs=$clock.ElapsedMilliseconds; watcher=$job.State.ToString()}) -Append
                Write-Host ("`r{0}  +{1}s  watcher={2}     " -f [DateTimeOffset]::Now.ToString('HH:mm:ss.fff zzz'),$second,$job.State) -NoNewline
            }
            if (![Console]::IsInputRedirected -and [Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true).KeyChar.ToString().ToLowerInvariant()
                if ($key -eq 's') { break }
                $labels = @{'1'='before USB connection';'2'='before ISP tool launch';'3'='before manual reproduction trigger';'4'='operation survived'}
                if ($labels.ContainsKey($key)) {
                    Write-Durable (Join-Path $SessionDirectory 'timeline.jsonl') (Stamp 'marker' @{note=$labels[$key]; elapsedMs=$clock.ElapsedMilliseconds}) -Append
                    Write-Host "`nMARK $key : $($labels[$key]) @ $([DateTimeOffset]::Now.ToString('o'))"
                }
            }
            Start-Sleep -Milliseconds 100
        }
    } catch {
        Write-Durable (Join-Path $SessionDirectory 'errors.jsonl') (Stamp 'recorder-failure' $_.Exception.Message) -Append
        throw
    } finally {
        if ($job) { Stop-Job $job; Receive-Job $job -ErrorAction Continue | Out-File (Join-Path $SessionDirectory 'watcher-output.txt'); Remove-Job $job }
        Attempt 'stop-trace' { Stop-Trace $manifest }
        Write-Durable (Join-Path $SessionDirectory 'timeline.jsonl') (Stamp 'recorder_exit' $null) -Append
        Write-Host "`nRecorder ended. Run -Action Collect (also after reboot). Directory: $SessionDirectory"
    }
    return
}

Resolve-Session
$manifest = Get-Content -LiteralPath (Join-Path $SessionDirectory 'session.json') -Raw | ConvertFrom-Json
switch ($Action) {
    'Watch' {
        $last = ''
        while (!(Test-Path -LiteralPath (Join-Path $SessionDirectory 'stop.request'))) {
            try {
                $devices = @(Get-PnpDevice -PresentOnly -ErrorAction Stop | Where-Object { $_.InstanceId -match '^USB\\|^USBSTOR\\|VID_1209&PID_C550|VID_4348&PID_55E0|VID_1A86&PID_55E0' } | Select-Object Status,Class,FriendlyName,InstanceId | Sort-Object InstanceId)
                $processes = @(Get-Process | Where-Object { $_.ProcessName -match 'wch|isp' } | Select-Object Id,ProcessName,Path | Sort-Object Id)
                $value = @{devices=$devices;processes=$processes}
                $text = $value | ConvertTo-Json -Depth 6 -Compress
                if ($text -ne $last) { Write-Durable (Join-Path $SessionDirectory 'devices.jsonl') (Stamp 'snapshot-change' $value) -Append; $last=$text }
            } catch { Write-Durable (Join-Path $SessionDirectory 'watcher-errors.jsonl') (Stamp 'snapshot-error' $_.Exception.Message) -Append }
            Start-Sleep -Seconds 2
        }
    }
    'Mark' {
        # Separate file avoids concurrent append to the heartbeat writer.
        $file = 'marker-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssfff') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.json'
        Write-Durable (Join-Path $SessionDirectory $file) (Stamp 'marker' $Note)
        Write-Host "Marker saved: $Note"
    }
    'Stop' {
        Write-Durable (Join-Path $SessionDirectory 'stop.request') (Stamp 'stop-request' $null)
        Attempt 'stop-trace' { Stop-Trace $manifest }
        Write-Host 'Stop requested. The foreground recorder should exit shortly.'
    }
    'Status' {
        $manifest | Format-List
        Get-Content (Join-Path $SessionDirectory 'timeline.jsonl') -Tail 4 -ErrorAction SilentlyContinue
    }
    'Collect' {
        Write-Durable (Join-Path $SessionDirectory 'stop.request') (Stamp 'collect-request' $null)
        Attempt 'stop-trace' { Stop-Trace $manifest }
        $collected = Join-Path $SessionDirectory ('collected-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,4))
        New-Item -ItemType Directory -Path $collected | Out-Null
        Attempt 'after-snapshot' { Snapshot ('after-' + (Get-Date -Format 'yyyyMMdd-HHmmss')) }
        $since = ([DateTimeOffset]::Parse($manifest.startedUtc)).AddMinutes(-5).UtcDateTime
        $until = [DateTime]::UtcNow
        $xpath = "*[System[TimeCreated[@SystemTime >= '$($since.ToString('yyyy-MM-ddTHH:mm:ss.fffZ'))' and @SystemTime <= '$($until.ToString('yyyy-MM-ddTHH:mm:ss.fffZ'))']]]"
        $logs = @('System','Application','Microsoft-Windows-Kernel-PnP/Configuration','Microsoft-Windows-Kernel-PnP/Device Management','Microsoft-Windows-USB-USBXHCI-Operational','Microsoft-Windows-USB-UCMUCSICX/Operational')
        foreach ($log in $logs) {
            $safeName = $log -replace '[^A-Za-z0-9-]','_'
            Attempt "event-export:$log" { Run-Native 'wevtutil' @('epl',$log,(Join-Path $collected "$safeName.evtx"),"/q:$xpath",'/ow:false') (Join-Path $collected 'exports.txt') }
        }
        Attempt 'setupapi-copy' { Copy-Item -LiteralPath "$env:windir\INF\setupapi.dev.log" -Destination (Join-Path $collected 'setupapi.dev.log') }
        $dumps = @()
        foreach ($dir in @("$env:windir\Minidump","$env:windir\LiveKernelReports")) {
            if (Test-Path -LiteralPath $dir) {
                Attempt "dump-list:$dir" { $script:dumps += @(Get-ChildItem -LiteralPath $dir -Filter '*.dmp' -Recurse -ErrorAction Stop | Where-Object { $_.LastWriteTimeUtc -ge $since } | Select-Object FullName,Length,LastWriteTimeUtc) }
            }
        }
        $memory = "$env:windir\MEMORY.DMP"
        if (Test-Path -LiteralPath $memory) { $dumps += Get-Item -LiteralPath $memory | Select-Object FullName,Length,LastWriteTimeUtc }
        Write-Durable (Join-Path $collected 'dump-inventory.json') @($dumps)
        if ($IncludeMemoryDump) {
            foreach ($dump in $dumps) {
                if ($dump.LastWriteTimeUtc -lt $since) { continue }
                Attempt 'dump-copy' {
                    $drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($collected))
                    if ($drive.AvailableFreeSpace -lt $dump.Length + 1GB) { throw "Not enough free space to copy $($dump.FullName)" }
                    $name = ($dump.FullName -replace '[:\\/]','_')
                    Copy-Item -LiteralPath $dump.FullName -Destination (Join-Path $collected $name)
                }
            }
        }
        $summary = [ordered]@{directory=$SessionDirectory; collectedUtc=[DateTimeOffset]::UtcNow.ToString('o'); usbTraceRequested=$manifest.usbTrace; evtxCount=@(Get-ChildItem $collected -Filter '*.evtx').Count; dumps=@($dumps); note='Read errors.jsonl. Missing dump/ETL tail does not distinguish power loss from a crash. Dump files are copied only with -IncludeMemoryDump.'}
        Write-Durable (Join-Path $collected 'summary.json') $summary
        $hashes = @(Get-ChildItem -LiteralPath $collected -File | Get-FileHash -Algorithm SHA256)
        Write-Durable (Join-Path $collected 'sha256.json') $hashes
        Write-Host "Collected: $collected"
        Write-Host 'Keep the whole session folder, including usb.etl and timeline.jsonl. Review errors.jsonl for incomplete exports. No upload was performed.'
    }
}
