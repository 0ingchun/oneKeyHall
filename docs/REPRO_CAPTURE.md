# 异常关闭复现取证

> 文件清理说明（2026-11-17）：本文保留历史诊断过程和取证用法。文中提到的旧 HEX、baseline 构建目录和 tmp 分析副本已清理，不再作为可下载文件；当前构建见 [V2.6.1](RELEASE_2.6.1.md)。取证脚本及电脑上的实际采集记录保留。


目标是区分：只有屏幕熄灭、系统正常关机/睡眠、Windows 崩溃、以及未留下崩溃信息的突然停机。采集程序不发送串口命令，不刷写，不启动 WCH 软件，不恢复网页下载按钮，不主动复现。

## 1. 先准备独立录像与转储

保存正在编辑的文件，关闭无关工作。手机保持独立录像，画面同时包含电脑屏幕、机身电源指示灯、键盘板指示灯；保留声音。电脑上的录屏也可能随断电丢失，不能代替手机。

本机检查时是小型转储、蓝屏后自动重启；分页文件已存在。可选配置为自动内存转储并关闭蓝屏后自动重启。在项目根目录打开**管理员 PowerShell**，执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\capture_incident.ps1 -Action ConfigureDump
```

配置会先备份原始三个注册表值，再修改 CrashDumpEnabled=7、AutoReboot=0、LogEvent=1；不会调整分页文件或制造蓝屏。保存工作后正常重启，让配置生效。磁盘空间和分页文件是否足够会记录在 baseline；已有分页文件不保证所有崩溃都能留下转储。

不修改此配置也可录制，但可能错过短暂蓝屏。排查完恢复原设置：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\capture_incident.ps1 -Action RestoreDump
```

恢复前会检查这些设置是否被其他软件改变，避免覆盖后续修改。配置/恢复脚本尚未在本次会话执行。

## 2. 开始采集，确认真的准备好了

键盘先保持拔出。右键 `scripts\incident-start.cmd` → **以管理员身份运行**。

等窗口显示 **`READY USB_TRACE=True`** 和连续走动的时钟。出现错误、只有 `USB_TRACE=False`、watcher 为 Failed，均不要按正式 USB 跟踪已启动来使用。启动通常需几秒，生成基线时不要触发问题。

每次生成独立目录，默认位于：

```text
%LOCALAPPDATA%\OneKeyHallDiagnostics\日期-时间-随机编号\
```

这个目录不在项目的 OneDrive 同步区。界面显示含时区的电脑时间；手机先拍到该时钟和 READY 提示至少 5 秒，然后再记录操作。记录目录不要删除。

## 3. 分开标记每一步，不把多种动作混在一起

以下数字键必须在**采集窗口有焦点时**按；它们只写入磁盘标记，不执行对应操作。

| 按键 | 记录的意图 | 随后人工操作 |
| --- | --- | --- |
| `1` | 即将连接 USB | 若本轮要测试连接，接入原来那根线、原来那个端口；记录板灯、系统提示音和是否仍能操作 |
| `2` | 即将打开烧录软件 | 若本轮涉及它，再打开并记录具体程序名称；不要把 WCHISPStudio 主页崩溃与整机停机混为一谈 |
| `3` | 即将触发原问题动作 | 先拍到标记，再切到目标窗口执行那**一个**动作；口述点击时刻，保持录像 |
| `4` | 操作后电脑仍正常 | 写入存活结果，按 `S` 停止 |
| `S` | 停止采集 | 正常关闭跟踪并收尾 |

每一步之间留几秒，便于在录像和 ETW 中区分连接、软件启动、软件命令。保持原条件，先不要换驱动、换 USB 口、改固件或接入新的仪器；这些会改变复现条件。

**当前固件支持手动 ISP。** 连接且固件能力 bit 0 为 1 时，下载模式按钮启用。先完成采集和录像，在采集窗口按 `3`，再切回网页点击“进入下载模式”并确认。页面只根据固件能力启用按钮，不会检测采集程序是否真的在运行。若按钮提示固件不支持，本轮不能通过该入口复现；不要为此临时刷回旧 HEX。按 `3` 本身不会发送命令。

如果电脑变黑，手机继续拍：电源灯是否灭、风扇是否停、是否出现重启 Logo/蓝屏、板灯是否还亮，以及之后如何恢复。如果出现蓝屏且正在写转储，不要立即强制断电。如果已停机，本轮结束，不用连续多次复现。灯和风扇只能作为现象证据，不能代替电压测量。

也可在另一个 PowerShell 窗口写中文备注：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\capture_incident.ps1 -Action Mark -Note '准备点击原问题动作；烧录软件未打开'
```

独立备注文件避免与存活记录同时写同一文件。不在前台采集窗口时，也可右键以管理员运行 `incident-stop.cmd` 停止。默认前台最多运行 30 分钟；若强行关闭窗口导致跟踪未停止，应执行 Stop 或 Collect。ETW 使用独立会话名，不停止其他软件的跟踪。

## 灰色下载按钮与当前固件

网页显示“当前固件不支持软件进入下载模式”时，表示能力 bit 0 未设置（页面现在显示具体能力值）。当前 V2.6.1 默认返回 0xFF，支持 ISP。不能靠刷新网页或去掉 disabled 属性补回设备代码。

当前默认构建命令：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build_firmware.ps1
```

当前统一输出 `firmware/build/onekeyhall-ch552-24mhz.hex`，默认支持 ISP。它支持命令 99 的 ACK、约 300 ms 等待、USB 交接和跳入 0x3800 的路径，用于取证，**不是异常关闭修复版**。1200 波特率自动跳转仍关闭。配置版本及 EEPROM 布局不变。

需要通过此前已验证可用的烧录方式更新设备，再重新连接网页。当前不支持命令 99 的固件不能用这个灰色按钮给自己升级。若没有可用的硬件 ISP 入口，应先确认入口，不要短接霍尔输出或猜测下载引脚。构建脚本不会烧录或触发设备。

## 4. 重启后第一件事：收集已有记录

不要先开新一轮 Start。保持故障键盘拔出，右键 `scripts\incident-collect.cmd` → **以管理员身份运行**。

它默认找到最后一轮目录，停止尚存的本轮 ETW，会导出从开始前 5 分钟到收集时刻的系统、应用和 USB/PnP 事件，并保存 SetupAPI、重启后基线、相关 DMP 清单。它不需要键盘连接，不会上传。

需要收集非最后一轮时：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\capture_incident.ps1 -Action Collect -SessionDirectory 'C:\Users\你的用户名\AppData\Local\OneKeyHallDiagnostics\对应目录'
```

默认只列出转储位置与大小，避免复制很大的内存文件。若确实生成了转储且需要保留副本，可在同一命令加 `-IncludeMemoryDump`；复制前会检查剩余空间。报告有访问失败时看 `errors.jsonl`，以管理员重新 Collect 即可，原证据不会被覆盖。完整转储可能包含内存中的敏感信息，不要直接公开上传。

## 5. 收到什么、能判断什么

| 文件 | 用途与限制 |
| --- | --- |
| `session.json`、`before*.json` | 采集时刻、系统/BIOS、驱动、WCH 进程、转储与分页文件设置、本地 HEX 和工具哈希。HEX 哈希不代表设备里就是该版本 |
| `timeline.jsonl`、`marker-*.json` | 每秒存活时间、相对运行时间、操作意图标记。WriteThrough + Flush(true) 尽量立即写盘；硬盘缓存、突然掉电仍可能丢最后记录 |
| `devices.jsonl` | 后台每约 2 秒检查 USB 设备和 WCH/ISP 进程，仅变化时写入；可能漏掉短暂枚举，不能代替 ETW |
| `usb.etl`（可能含编号后缀） | USBXHCI/UCX/USBHUB3 默认、错误、电源、PnP、状态机、枚举跟踪；最多 256 MB 循环，1 秒刷新。突然停机可能使尾部或整份 ETL 不可解析 |
| `collected-*/System.evtx`、`Application.evtx` 等 | 事件原始数据。41/6008 只能确认非正常关机，不能单独确定原因；1074、42、1001 和转储可提供不同线索 |
| `dump-inventory.json` | 是否找到此次附近的 Minidump/LiveKernelReports/MEMORY.DMP。没有 DMP 不证明一定是断电 |
| 手机原始视频 | 系统无法写日志时仍保留屏幕、电源灯、板灯和声音；拍入时钟用来与日志对齐 |

保留**整个会话目录**和手机原始视频，说明执行了哪些步骤、当时哪个软件开着、哪个固件已刷入、USB 口位置。脚本会记录本机设备标识和程序路径；USB 跟踪涉及当前控制器上的其他设备，虽然未显式开启总线数据载荷关键字，分享前仍应检查隐私。

## 验证记录与依据

已经在键盘拔出的情况下测试：非管理员基线采集、8 秒存活写盘、设备快照、独立标记、结束清理、六类 EVTX 和 SetupAPI 导出。非管理员读取转储目录被拒绝，已如实记录为警告；不能误当成“没有转储”。本次没有管理员权限，尚未实际启动 USB ETW、修改/恢复崩溃设置，也没有复现关机。正式流程必须以 READY USB_TRACE=True 为准。

- [Microsoft：使用 Logman 捕获 USB 事件](https://learn.microsoft.com/en-us/windows-hardware/drivers/usbcon/how-to-capture-a-usb-event-trace)
- [Microsoft：USB ETW 事件范围](https://learn.microsoft.com/en-us/windows-hardware/drivers/usbcon/usb-event-tracing-for-windows)
- [Microsoft：转储文件与 CrashControl 配置](https://learn.microsoft.com/en-us/troubleshoot/windows-server/performance/memory-dump-file-options)

本机 `logman query providers` 已确认三个 USB 提供程序及所需关键字；脚本从实际输出生成掩码。所有证据仅保存在本机。

历史候选记录（2026-11-17，当时尚未验证，后续结果见排查记录）：取证版增加了跳转前 USB SIE/FIFO 复位及地址清零，另输出明确文件名 `onekeyhall-ch552-24mhz-isp-usb-reset.hex`。旧版本存于 `firmware/build-isp-repro-baseline`。这是针对“ACK 成功后应用设备很快重新出现、无新 ISP 到达记录”的候选修正；不要把它当作已实物确认的修复。详见 [排查记录](ISP_INCIDENT.md)。
