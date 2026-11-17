# 软件 ISP 异常关闭反馈排查

> 当前发布策略：统一使用 `firmware/build/onekeyhall-ch552-24mhz.hex`，默认支持手动 ISP（能力 0xFF）。下文保留历史排查记录。


> 文件清理说明（2026-11-17）：本文保留历史诊断过程和取证用法。文中提到的旧 HEX、baseline 构建目录和 tmp 分析副本已清理，不再作为可下载文件；当前构建见 [V2.6.1](RELEASE_2.6.1.md)。取证脚本及电脑上的实际采集记录保留。


日期：2026-11-16。用户反馈点击网页进入下载模式后电脑关机。用户已确认瞬间黑屏/断电，开机后程序会话结束但保存的文件未丢失；键盘已拔出。当时单根 USB 直连电脑，没有扩展坞、外部电源或下载器。具体点击时刻尚未确认。未重复触发，也未对设备执行连接、复位、烧录或 USB 切换。

## 已取得证据

本机 Windows System 日志：22:54:14 的事件 6008 报告 22:46:52 意外关闭；22:54:01 的 Kernel-Power 41 中 BugcheckCode=0、SleepInProgress=0、PowerButtonTimestamp=0、LongPowerButtonPressDetected=false。此次查询过去两天未找到 1074 或 1001。未找到可读取的 Minidump/MEMORY.DMP。

这些记录确认异常关闭，不能直接判定 USB 驱动崩溃、供电保护、键盘电源键或其他根因；未记录蓝屏错误码也不排除崩溃。[Microsoft 事件 41 说明](https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/event-id-41-restart)。

旧代码命令 99 路径：stop_keys（Keyboard_releaseAll 将八字节 HIDKey 清零），停止输出/校准，成功 ACK，等待 300 ms，再 USB_CTRL=0、EA=0、延时约 100 ms、lcall 0x3800。没有显式发送关机快捷键。此为静态代码检查，不证明 USB 实际报告或跳转时硬件行为正确。先前主机测试模拟了 USB 和跳转，未覆盖真实 USB/BootLoader 切换。

## 当时的处置（历史记录）

- 网页按钮禁用，点击处理不再发命令；协议客户端在 request 层拒绝命令 99。
- 固件命令 99 返回拒绝，能力 bit 0 清零；移除 BootLoader 跳转代码及 CDC 1200 波特率自动跳转。
- 原 HEX、verification.json、sketch 和 USBCDC.c 当时备份于 tmp/isp-incident-20261116，清理时已将该旧源码/固件副本移出项目归档。
- 重新编译撤回版；仅在本机模拟输入测试，没有连接/刷写硬件。
- 这属于隔离可疑路径，根因仍未确定。设备中已经刷入的旧固件未被改变。

下一步需要进一步定位 USB/ISP 切换期间的固件状态与主机故障原因，现有离线证据不足。不要通过重复点击复现。不能仅凭事件 41 就断言供电或驱动故障。

## 后续只读检查

用户确认单根 USB 直连后，读取了已有 SetupAPI 和 Kernel-PnP 日志，没有启用额外跟踪、修改驱动或连接设备。

- 22:39:15：系统成功配置并启动 `USB VID_4348 PID_55E0`，绑定 `oem93.inf`、`CH375_A64`，驱动包版本 `3.5.2025.8`、日期 2025-08-21。CH375W64.SYS 的本机签名检查为 Valid。签名有效不等于没有驱动缺陷。
- 22:39:53：该 ISP 设备发生意外移除记录。
- 22:50:15：应用设备 `USB VID_1209 PID_C550` 发生意外移除记录。
- 22:50:36：`USB VID_4348 PID_55E0` 再次发生意外移除记录。设备移除事件本身不能证明主机故障由该设备引起。
- USBXHCI Operational 没有事件；该时间窗口的 UCMUCSICX 未返回事件。缺少日志不等于没有控制器或电气故障。

`4348:55e0` 是 CH55x ISP 使用的设备标识，可对照 [isp55e0 项目](https://github.com/frank-zago/isp55e0) 和 [CH55xDuino 作者的硬件测试项目](https://github.com/DeqingSun/CH552-Automatic-Test-Jig)。可以确认当晚系统识别过 ISP 设备，不能仅凭这些记录确认是哪一次软件按钮导致枚举，或断言 WCH 驱动是关机根因。

时间判断修正：6008 报告的 22:46:52 之后仍有 22:50 的 PnP 记录，因此不能把该字段直接当作已核实的准确断电时刻。保留各原始时间，不据此拼接确定的因果顺序。

## 复现取证工具

应用户要求，新增 [复现记录方案](REPRO_CAPTURE.md) 和 `scripts/capture_incident.ps1`，支持独立操作标记、存活写盘、USB ETW 和重启后收集。已验证非管理员基础采集/导出；未启用实际 USB ETW、未修改转储配置、未触发复现。下一次不能只依赖 6008 的时间，应结合手动标记、手机录像和跟踪。

## 按用户要求恢复 host 入口

用户明确要求重新打开 host 下载按钮，已恢复固件能力检测、确认提示及命令 99/ACK 处理。撤回版固件及 HEX 未修改，仍不支持软件 ISP；本次没有连接设备或发送命令。此前隔离处置保留为排查历史，该段记录当时 host 状态；当前用法以项目 README 为准。

## 灰色按钮后的独立取证构建

用户提供截图显示设备未声明下载能力。随后恢复手动命令 99 和能力 bit 0，继续禁用 1200 波特率自动触发。本次仅生成文件，未确认截图所连接设备的具体固件、未烧录、未触发跳转；根因仍未查明。

## 0x03 设备点击后断开、应用设备再次可见

用户确认网页能力为 0x03，点击后网页变为未连接，之后未拔插。只读检查时 Windows 存在应用 VID_1209/PID_C550 的 COM6/HID，没有当前存在的 VID_4348/PID_55E0 或 VID_1A86/PID_55E0。近期有多条应用设备移除记录，不能只凭“网页断开”确认成功 ACK 或 ISP 枚举。用户目录中仍只有此前 23:34 的采集器冒烟测试会话，未找到本次新的采集会话。

CH55xDuino 作者文档明确提到 BootLoader 可以超时退出（https://github.com/DeqingSun/ch55xduino#driver-for-windows），因此超时返回应用是一种可能，但尚未证实本次短暂进入过 ISP。未改动跳转实现，也未再次发送命令。网页新增按钮旁的分阶段记录并尽量保存 localStorage，以便区分取消、等待、成功 ACK、串口关闭和错误；不会自动探测/打开设备。

## 2026-11-17 成功 ACK 与 PnP 时间对照

用户提供的浏览器记录包含三次成功应答 `[1000,99,0]`：UTC 2026-11-16 16:09:46.604、16:11:28.709、16:11:50.792，对应北京时间 2026-11-17 00:09:46、00:11:28、00:11:50。可确认命令已经被固件接受，不能将“串口关闭”当作 ISP 已枚举。

随后只读检查：应用设备 VID_1209/PID_C550 的 LastArrivalDate 为 2026-11-17 00:11:51；ISP VID_4348/PID_55E0 的 LastArrivalDate 仍是 2026-11-16 23:53:49、LastRemovalDate 为 23:53:59。三次请求附近分别有应用设备移除事件，没有对应的新 ISP 到达证据。因此先前“可能进入后超时返回”的说法只是假设，当前证据更需要检查进入 ISP 前后的交接。不能根据 PnP 未到达进一步断言 BootLoader 指令从未执行。

### USB 交接候选修正

旧路径只设置 USB_CTRL=0 后关中断并跳转；这不会置位 bUC_RESET_SIE / bUC_CLR_ALL。CH552 本地手册 §16.3 定义这两位分别复位 USB 协议处理器/多数控制寄存器与清空中断标志/FIFO（需软件清零）；USB_CTRL 上电复位值是 0x06。另一个 CH552 项目的 [CubeTouch 跳转实现](https://cubetouch.noteolvid.es/docs/firstSteps/programming/) 也在跳转前使用 USB_INT_EN=0 和 USB_CTRL=0x06。

候选版仅在显式 ISP 构建中改为：EA=0 → USB_INT_EN=0 → USB_CTRL=bUC_RESET_SIE|bUC_CLR_ALL → USB_DEV_AD=0 → 保留原 100 ms 延时及 lcall 0x3800。让 BootLoader 接手接近复位状态的 USB 控制器；复位位由 BootLoader 初始化 USB 时处理。没有改系统时钟、GPIO、Flash/EEPROM 或 1200 波特率逻辑。是否兼容设备的实际 BootLoader、是否解决枚举失败仍需实物验证，不宣称已找到关机根因。

旧取证 HEX 和校验记录保留于 `firmware/build-isp-repro-baseline`。新的明确命名文件为 `firmware/build-isp-repro/onekeyhall-ch552-24mhz-isp-usb-reset.hex`；常规 `isp-repro.hex` 别名也随本次构建更新。新增主机测试从实际 USBCDC.c 提取交接函数，将 SFR 和跳转替换为测试接口，检查带旧地址/使能状态时，先复位/屏蔽再等待和跳转；这些仍不等于实际 USB 枚举验证。

## USB 复位候选的实际反馈，以及 TMOD 交接检查

用户明确确认已烧录 `onekeyhall-ch552-24mhz-isp-usb-reset.hex`，工具提示成功。随后浏览器在 UTC 2026-11-16 16:50:19.713 和 16:50:33.946 收到成功 ACK。只读检查中，应用设备最后到达为北京时间 2026-11-17 00:50:34，ISP 设备最后到达仍为 00:49:26、移除 00:49:29；00:50:20 和 00:50:34 有应用设备移除记录。因此这一版未解决已识别 ISP 枚举失败。正常烧录期间能出现 ISP，不能归因于完全缺少 ISP 驱动。未重新触发设备。

代码检查发现另一个交接兼容性问题：本机 CH55xDuino 0.0.16 `wiring.c` 的 init() 把 TMOD 低四位设为 0x02（Timer0 模式 2）。[Wagner 的 CH552 项目](https://github.com/wagiminator/CH552-Macropad-mini/blob/main/software/src/system.h) 的 BOOT_now() 在跳转前显式 TMOD=0。[公开的 BootLoader 2.31 镜像](https://github.com/usbman01/WCH-8-Bit-x51-controllers/blob/master/bootloaders/original/ch552/loaderv2_31.c) 及同目录 2.40 镜像包含 `43 89 01`（ORL TMOD,#1），随后给 TL0/TH0 装初值并启动 Timer0 的分支。若该分支继承 0x02，会得到 0x03，而非预期 0x01；本地 CH552 手册表 12.1.2 说明这是不同的计时模式。

限制：镜像来自第三方公开存档，尚未读取用户芯片的实际 BootLoader，也未确认版本和执行分支。上述镜像还有基于引导状态/引脚/配置的分支；软件进入并不必然执行这个定时器配置分支。因此只能确认模式残留存在兼容性风险，不能据此断言已经找到此次枚举失败原因，更不能用于解释早先整机异常关闭。

新诊断候选只在原 USB 复位交接的 100 ms 等待结束后、lcall 0x3800 前增加 TMOD=0。300 ms ACK 等待仍在正常计时环境中执行。旧 `isp-usb-reset.hex` 及其记录归档到 `firmware/build-isp-usb-reset-baseline`，原明确命名 HEX 保持原内容；新文件为 `isp-tmod-reset.hex`，通用 `isp-repro.hex` 别名更新到新候选。

主机测试以 Arduino 实际 TMOD=0x02 为初始状态执行生产交接函数，检查跳转前 TMOD=0，并模拟 ORL 模式选择应得到模式 1；这不是 BootLoader 仿真，也不验证 USB 枚举。下一步先从已有烧录日志确认 BootLoader/ISP 版本，再决定实物验证；没有自动打开设备、发送命令或烧录。

## 确认 BootLoader 2.50：定时器模式冲突的直接依据

用户提供 01:10:13–01:10:16 的完整成功日志：BTVER:02.50，待下载 BIN 长度 13856B，擦除、编程、校验成功。长度与 USB-only 候选一致，不能仅凭长度证明文件身份；结合此前用户确认，仍按该候选处理。日志还显示 DataFlash 已擦除，按本项目布局这会清除保存的校准/配置。软件 ISP 命令本身不擦除 DataFlash。

找到镜像提取作者发布的 [2.50 分析与附件](https://www.mikrocontroller.net/topic/462538?page=4#7196924)，从同站镜像取得 [汇编](https://embdev.net/attachment/570882/bootloaderV25.a51) 和 [Intel HEX](https://embdev.net/attachment/570249/org_v25.hex)，仅作离线检查，未烧录 BootLoader。HEX 的 SHA256 为 `cc4bfffb50a44014a154065039dcc76ca70313ac9e9d0799c93de4847d58341c`，已检查记录校验和。文件在 `tmp/boot-investigation/`。

交叉核对汇编与 HEX 中的机器码：

| 地址 | 行为 |
| --- | --- |
| 0x3BD9 | ORL TMOD,#1；TL0=0xC0，TH0=0x64，启动 Timer0 |
| 0x3C63 | USB 路径初始化超时计数为 1250 |
| 0x3CB9 | 溢出后重新加载初值并增加计数 |
| 0x3CCA | 比较阈值 1500，达到后请求软件复位 |

区别于此前只检查的旧版本，2.50 在引导状态判断之前就启动此定时器，软件进入路径也受影响。CH552 使用 UART1 的分支不会重写 TMOD。内核留下的模式 2 与 ORL 1 合成模式 3：仅 TL0 的 8 位溢出计数参与超时；预期模式 1 使用 16 位计数。

按 BootLoader 设置的 12 MHz 和应用留下的 Timer0 Fsys/12 时钟，250 次溢出的理想计数时间分别为 `(65536-0x64C0)*250 / 1MHz = 9.936s` 与 `(256-0xC0)*250 / 1MHz = 16ms`。还需加软件轮询/USB 处理开销，不能把 16ms 当作实测值。该模式冲突可解释枚举前就返回应用，是目前最有力的原因；仍未读取该实物完整 ROM，也未验证修正后的枚举，因此不宣称整机异常关闭根因已找到。

现有 `isp-tmod-reset.hex`（13860B，SHA256 `e90644720c0693c8e1bdc01a8f6a663289133b9caa6bf43f26aea1facb15add3`）已包含最终跳转前 TMOD=0。本轮没有再改生产固件；已核对目标汇编中的 `mov _TMOD,#0x00` 紧接 `lcall #0x3800`，主机测试增加两种模式的计数模型。模型不等于周期精确仿真或实物验证。

下一轮只验证这一处修正：烧录明确命名的 TMOD 候选，保留其他配置；取消烧录工具的“清除 DataFlash”和“连接后自动下载”，防止额外擦参数或枚举后自动重烧掩盖现象。记录工具显示、操作时刻和 USB 到达事件，按 REPRO_CAPTURE.md 准备采集后只触发一次。观察成功标准是 ISP 设备/烧录工具识别，而非网页断开；超时返回应用可以发生，但应先能枚举。

## 下载请求记录改为仅当前页面保留

按用户要求，网页下载记录不再读写 localStorage；页面初始化时尝试删除旧版本的 onekeyhall-boot-events 项，刷新后从空记录开始。当前页面仍保留最近 12 条阶段记录，断开设备不清空。需要留存复现证据时，应在刷新前复制页面日志；独立取证工具不受此改动影响。

## 用户确认 TMOD 修正后下载模式成功

用户反馈“这次固件成功了”，确认本次 TMOD 候选的软件进入下载模式在其设备上成功。此为用户实物反馈，尚不能用于认定最早电脑异常关闭的根因。

## 2.1.0：进入 ISP 前关灯与真实应用版本

按用户要求，命令 99 的已接受路径先发送 RGB 全黑并暂停灯效，保持原配置，然后沿用 ACK 延时和 TMOD 修正跳转。版本查询新增命令 5，应用版本 2.1.0 与配置格式 2 分离，网页兼容旧固件并显示“未上报”。两个构建均编译通过，固件每种 15 组场景、交接模型及 23 项 Node 测试通过；未烧录此次 LED-off 版本。上一轮已验证可进入 ISP 的 TMOD 版本归档至 build-isp-tmod-reset-baseline。
