# WCHISPStudio 4.0 启动崩溃问题报告

报告日期：2026-11-16（北京时间）  
反馈对象：WCH / 南京沁恒微电子技术支持  
问题：主板序列号为空时，WCHISPStudio 原始主页启动崩溃

## 1. 现象与影响

从桌面快捷方式或安装目录运行 WchIspStudio.exe，程序在进入带“MCU 系列选择”的主页之前退出。Windows 应用程序日志多次记录同一异常代码和同一故障偏移。用户无法通过总入口选择芯片系列。

同一安装目录中的 WCHISPTool_CH54x-55x 独立工具可以启动并保持响应。本报告仅涉及总入口启动崩溃。

预期行为：未能读取主板序列号时仍可进入主页；缺失此信息不应导致空指针访问。

## 2. 软件与环境

| 项目 | 实测值 |
| --- | --- |
| 应用 | WchIspStudio.exe，文件版本 4.0.0.0，32 位 |
| PE 时间戳 | 0x6A192F07 |
| 安装位置 | C:\WCH\WCHISPTool |
| 系统 | Windows 11 家庭中文版，26H2，10.0.26300.9974 |
| CPU | AMD Ryzen 7 7745HX with Radeon Graphics |
| 主板 | MECHREVO MRID6-23 |
| WMI 主板序列号 | Win32_BaseBoard.SerialNumber 为 null |
| 原文件签名 | 本地检查有效，签名主体为 Nanjing Qinheng Microelectronics Co., Ltd. |

原始 WchIspStudio.exe 的 SHA-256：

```text
E01BD0830B60A79CBAD3E27C596DC09EB1B65BC9A44EE85189717E82A17F054D
```

本地 WCHISPTool_Setup.exe 安装包的 SHA-256：

```text
8D2004251DCB59D43C63A132F341A76DCA99B863FC03C1556987B679E8AFAC95
```

已将安装目录中的原始 EXE 与本地安装包解出的对应 EXE 比较，两者 SHA-256 一致，未发现文件差异。此校验不等同于对官网当前下载内容的独立校验。

## 3. 复现条件与步骤

1. 在本机查询 WMI 主板序列号，结果为 null。
2. 启动未经修改的 WchIspStudio.exe。
3. 程序在主页显示前崩溃。
4. 查看 Windows“应用程序”日志，确认异常代码 0xC0000005、故障偏移 0x0000996A。

可用于检查触发条件的只读 PowerShell 命令：

```powershell
Get-CimInstance Win32_BaseBoard |
    Select-Object Manufacturer, Product,
        @{Name='SerialNumberIsNull'; Expression={$null -eq $_.SerialNumber}}
```

本机输出 SerialNumberIsNull = True。没有修改 BIOS/SMBIOS、WMI 仓库或系统序列号来制造此条件。复现已在本机重复观察，尚未在其他电脑或其他版本 Windows 上验证。

## 4. 崩溃与调试证据

Windows Application Error 事件 1000 的代表记录时间为 2026-11-16 22:25:07：

- 应用与故障模块：WCHISPStudio.EXE，版本 4.0.0.0。
- 异常代码：0xC0000005。
- 故障偏移：0x0000996A。

32 位 CDB 调试器捕获的崩溃现场：

```text
WchIspStudio+0x996a:
0046996a 8a01  mov al,byte ptr [ecx]
ecx=00000000
```

该次加载基址为 0x00460000，因此指令地址对应模块 RVA 0x996A。调试启动时只在子进程环境中设置了 RunAsInvoker；正常启动时已有上述同偏移崩溃日志。

二进制中可见 WMI 查询与属性名：

```sql
SELECT SerialNumber FROM Win32_BaseBoard
```

关键反汇编（以模块 RVA 标注）：

```text
+0x991E  mov ebx,dword ptr [ebp-54h]
+0x9921  test ebx,ebx
+0x9923  je +0x9946
...
+0x9946  xor ebx,ebx
+0x9948  mov edx,ebx
+0x994A  jmp +0x9965
...
+0x9965  mov ecx,edx
+0x9967  lea esi,[ecx+1]
+0x996A  mov al,byte ptr [ecx]
...
+0x999A  lea eax,[ebp-5Ch]
+0x999D  push eax
+0x999E  call [VariantClear]
```

结合本机 WMI 返回 null、属性名 SerialNumber、上述空指针分支及崩溃现场，定位为：程序没有安全处理缺失的主板序列号；空值分支将 EDX/ECX 置零后仍进入字符串长度扫描，最终读取地址 0。

上述说明来自运行时调试和反汇编分析，尚未取得厂商源码或厂商确认。

## 5. 本地验证性补丁与结果

为验证原因，在原 EXE 的独立副本 WchIspStudio_fixed.exe 中仅修改一个字节：

| 项目 | 修改 |
| --- | --- |
| 指令 RVA | 0x9923 |
| 原指令字节 | 74 21，空值时跳至 RVA 0x9946 |
| 新指令字节 | 74 75，空值时跳至 RVA 0x999A |
| 修改文件偏移 | 0x8D24：21 → 75 |

该修改让 null 属性值跳到已有的 VariantClear 清理路径，避开字符串扫描。逐字节比较确认只改变上述 1 字节。补丁仅适用于上述哈希的本地版本，是验证性兼容处理，不是厂商正式修复。

验证结果：

- 修复副本成功创建主窗口并保持响应。
- 窗口标题为“WCHISPStudio  ***点击右侧<MCU系列选择>按钮，选择下载界面。USB连接方式自动检测MCU型号”。
- 检查期间未观察到该修复副本的新 Application Error 事件。
- 桌面快捷方式现指向修复副本；官方原始 EXE 完整保留。
- 未实际点击验证每一个芯片系列入口，也未执行硬件烧录、擦除或校验。
- 本地修改使副本不再具有有效的厂商签名；没有向外分发该二进制文件。

修复副本 SHA-256：

```text
B90F5ED239F44010F9DB8C4EFC8D0960CCBBB6EB8D1B362B9895BF49D3B58F55
```

## 6. 建议厂商处理

请协助转交 WCHISPStudio 维护团队，确认并修复主板序列号读取失败或为空时的启动路径：

- 检查 WMI 查询和属性读取的 HRESULT、VARIANT 类型，以及 BSTR 是否为空指针。
- 分别处理 VT_EMPTY、VT_NULL、空 BSTR、零长度字符串及查询失败情况。
- 在非必要硬件标识缺失时继续显示主页，并确保 COM/VARIANT 资源正确释放。
- 增加缺失序列号条件下的启动回归验证，并验证正常序列号场景及各芯片系列入口。
- 提供正式签名修复版本或官方建议的兼容方案，以替代本地验证性补丁。

请回复是否能够复现，以及预计修复版本。如需补充证据，可以继续提供针对该故障的日志摘录。

## 7. 官方联系来源

WCH 官方技术支持邮箱：tech@wch.cn。

- 官方产品手册中列明 Technical Support Email：https://www.wch.cn/uploads/file/20240821/1724227120114035.pdf
- 官方下载页：https://www.wch.cn/downloads/WCHISPTool_Setup_exe.html

## 发送记录

- 发送日期：2026-11-16（北京时间）。
- 收件人：tech@wch.cn。
- 邮件主题：问题报告：WCHISPStudio 4.0 在主板 SerialNumber 为 null 时启动崩溃（0xC0000005 / RVA 0x996A）。
- 发送内容：报告全文作为 HTML 邮件正文，无附件。
- 邮件服务返回状态：SENT。公开记录不包含个人账号或邮件标识。
- 该状态表示邮件已发送，尚未确认厂商收件或回复。

