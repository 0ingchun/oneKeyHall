# oneKeyHall

基于 **CH552E + 霍尔传感器**的磁轴单键键盘，配套通过 Web Serial 连接设备的网页控制台。

支持可调触发点、快速触发 RT、按键映射、设备内线性控制和行程灯效。配置完成后，键盘可独立运行，无需常驻网页或额外安装伴随程序。

[项目仓库](https://github.com/0ingchun/oneKeyHall) · [固件文件](firmware/build/onekeyhall-ch552-24mhz.hex) · [版本说明](docs/RELEASE_2.6.1.md) · [串口协议](docs/HALL_PROTOCOL.md)

## 功能

| 功能 | 说明 |
| --- | --- |
| 磁轴校准 | 松开、压到底两点校准，支持两种磁极方向，显示有效 ADC 跨度 |
| 触发手感 | 可调触发点、释放点、顶部死区、滤波强度和确认采样数 |
| 快速触发 RT | 根据行程极值动态释放和重新触发，网页显示实时阈值线 |
| 按键映射 | KEY1 / KEY2、单键、组合键、最多 30 字节 ASCII 文本 |
| 双击 | 可配置 50–1000 ms 间隔，默认 200 ms；键盘双击模式与 RT 互斥 |
| 线性控制 | 行程控制音量、滚轮速度、固定位置触控面积和压力 |
| 双击反向 | 在线性模式中切换音量方向、滚轮方向或触控大小方向 |
| RGB 灯效 | 固定、呼吸、HUE 渐变、行程亮度、反向亮度、行程颜色、颜色亮度联动 |
| 设备信息 | 读取应用固件版本、BootLoader 版本、芯片序列号和累计释放次数 |
| 设备名称 | 自定义设备名称与 USB 名称；未保存自定义名称时使用芯片序列号生成默认名称 |
| 网页工具 | 中英文切换、浅色/深色/系统主题、键盘测试、触控测试、串口指令表 |
| 恢复出厂 | 清除全部设备配置和累计次数，立即保存；重新校准后使用 |
| 固件更新 | 下载网站发布的 HEX 文件，支持手动请求设备进入 ISP |

当前固件为 **V2.6.1**，配置格式 **V06**。只发布一个默认支持 ISP 的版本，文件为 `firmware/build/onekeyhall-ch552-24mhz.hex`。

## 硬件

| 项目 | 当前配置 |
| --- | --- |
| 主控 | CH552E，24 MHz 内部时钟 |
| 供电 | USB 5V |
| 霍尔传感器 | DRV5055A3QDBZR |
| 传感器输出 | OUT → R1（1 kΩ）→ P1.5 / AIN2 |
| ADC | 8 位，0–255；P1.5 配置为高阻输入 |
| RGB | P1.4，WS2812 |
| USB | CDC 配置串口 + HID 输入 |

原理图和主控手册位于 [hardware](hardware/)，结构设计和打印文件位于 [3D](3D/)。固件按上述接线实现，替换传感器或引脚时需同时检查硬件与源码。

## 快速开始

### 1. 烧录固件

使用适配 CH552 的烧录工具，将 [onekeyhall-ch552-24mhz.hex](firmware/build/onekeyhall-ch552-24mhz.hex) 写入设备。首次烧录需要通过硬件方式进入芯片的 ISP 模式；网页下载模式按钮需要设备已经运行支持该命令的固件。

升级时保留 DataFlash 可迁移已有名称、校准和参数；擦除 DataFlash 后需要重新校准和配置。HEX 只包含应用程序，不包含 BootLoader 或芯片配置字。

### 2. 打开网页控制台

本地运行需要 **Node.js 18 或更新版本**。Windows 下双击 `host/start.cmd`，或在项目根目录运行：

```powershell
node host/server.mjs
```

用桌面 Chrome / Edge 打开 **http://127.0.0.1:5173**，点击“连接设备”，选择键盘对应的串口。

网页无需安装 npm 依赖或打包。通过本地 HTTP 或 HTTPS 访问，不要直接双击 `index.html` 使用 `file://` 打开。网页只连接用户主动选择的设备。

### 3. 校准磁轴

1. 点击“开始校准 / 暂停输出”。
2. 完全松开轴体，保持静止，点击“① 松开轴体，采集顶部”。
3. 压住轴体到底，保持静止，点击“② 压住到底，采集底部”。
4. 底部采集成功后，校准自动应用。松开轴体，等待显示“已就绪”。
5. 设置按键与触发手感，点击“保存配置”，使校准和参数在断电后保留。

有效跨度至少需要 **16 个 ADC 计数**。采样不稳定或信号接近电源轨时会拒绝校准；请检查磁铁位置、传感器方向和接线。全新配置的 KEY1 默认为空格，两组文本内容默认为 `oneKeyHall`。

### 4. 应用与保存

- **自动应用**：停止修改参数约 400 ms 后，有效参数自动写入运行内存，不写 DataFlash。
- **保存配置**：将当前配置和累计释放次数写入 DataFlash，断电后保留。
- **校准期间**：暂停参数自动应用与键盘输出，完成底部采集后自动应用校准。
- **放弃待应用修改**：清除尚未应用的输入或取消未完成的校准，不撤销已经自动应用的参数。

自动应用后，关闭网页或断开配置串口不会停止设备运行；设备断电后恢复最后保存的配置。设备名称最多支持 12 个 BMP 字符（可含中文），留空使用 `oneKeyHall` 加 10 位十六进制芯片序列号；修改 USB 名称需保存后拔插 USB 生效。

## 恢复出厂设置

连接 V2.6.1 或更新固件后，点击页面下方的“恢复出厂设置”，阅读提示并确认。此操作清除设备名称、校准、按键与文本、双击、RT、灯光、线性参数和累计次数，**立即保存且无法撤销**。完成后需要重新校准；拔插 USB 后默认设备名称生效。固件、BootLoader、芯片序列号及浏览器语言/主题不变。

## 线性模式

在“工作模式”选择“线性模式”，再选择预设。所有输出均在固件内通过 USB HID 完成。

| 预设 | 行程行为 |
| --- | --- |
| 音量 / 音量反向 | 在设定的最低、最高音量之间随行程变化，可交换方向 |
| 滚轮向上 / 向下 | 松开停止，按得越深滚动越快 |
| 当前光标 | 在鼠标当前位置按住左键，释放磁轴后松开，可用于拖动 |
| 固定位置触控面积 | 在指定 X/Y 产生触点，接触面积随行程变化 |
| 固定位置触控压力 | 在指定 X/Y 产生触点，压力随行程变化 |
| 面积与压力联动 | 同时改变固定触点的接触面积和压力 |

勾选“**双击切换反向**”后，一对双击切换方向，下一对切回；使用同一个可配置双击间隔。当前光标左键预设不提供反向。开关可以保存，临时方向不保存，重新上电或应用配置后回到所选预设方向。

音量通过媒体音量键近似映射，不能读取系统实际百分比。固定位置触控需要系统和应用支持对应 HID 报告；当前光标预设仅提供普通鼠标左键，**不提供跟随鼠标的触控面积或压力**。

详细参数与限制见 [线性模式说明](docs/LINEAR_MODE.md)。

## 固件更新

网页提供两个独立入口：

- **下载最新固件（HEX）**：下载网站发布的文件，无需连接设备，不执行烧录。
- **进入下载模式**：向已连接设备发送 ISP 请求，固件先关闭 LED，再交接给 BootLoader；随后使用烧录工具更新固件。

当前固件能力值为 `0xFF`，默认支持手动 ISP，1200 波特率自动进入 ISP 保持关闭。网页收到成功应答后关闭应用串口，但这不等于已确认 ISP 枚举，也不会自动启动烧录软件。下载请求记录仅保留在当前页面，刷新后清空。

项目曾出现请求 ISP 后电脑异常关闭的反馈；后续 TMOD 交接修正曾获实机成功反馈，原异常原因仍未确定。相关记录保留在 [ISP 排查记录](docs/ISP_INCIDENT.md) 和 [取证说明](docs/REPRO_CAPTURE.md)。

### 发布新的下载文件

将要发布的 HEX 复制为 `host/firmware/latest.hex`：

```powershell
Copy-Item firmware/build/onekeyhall-ch552-24mhz.hex host/firmware/latest.hex -Force
```

网页下载路径为相对于站点入口的 `firmware/latest.hex`，浏览器保存名为 `oneKeyHall-latest.hex`。GitHub Pages 项目站点会带上仓库路径，例如 `/oneKeyHall/firmware/latest.hex`。**编译不会自动更新这个下载文件**，应在确认构建结果后手动发布。详见 [固件发布目录说明](host/firmware/README.md)。

## 部署网页

网页为原生 HTML / CSS / JavaScript，无服务端业务依赖，可部署到 HTTPS 静态站点。浏览器直接通过 Web Serial 与本机设备通信，云端不运行串口服务。

### GitHub Pages：源码和网页共用仓库

固件、硬件资料、文档和 `host` 可以保存在同一个仓库。已提供 [Pages 部署工作流](.github/workflows/pages.yml)，仅将 `host/index.html`、`host/assets/` 和 `host/firmware/latest.hex` 发布为网站，其他内容仍作为仓库源码管理。

1. 将项目（包括 `.github/workflows/pages.yml`）提交并推送到仓库的 `main` 分支。
2. 在 GitHub 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 **Actions → Deploy webhost to GitHub Pages → Run workflow** 手动触发首次部署，选择 `main`。后续向 `main` 推送网页、测试或工作流修改会自动部署。
4. 工作流成功后打开 Pages 显示的 HTTPS 地址。本仓库使用默认项目地址时为 `https://0ingchun.github.io/oneKeyHall/`；此处是部署后的预期地址，不表示已上线。

工作流先运行网页测试，再发布静态文件，不编译或烧录固件。发布新固件时先更新 `host/firmware/latest.hex` 再提交。主页面、指令表、触控测试和下载链接均使用相对路径，兼容项目子路径、本地服务及自定义域名。

访问在线网页时无需安装或运行 Node.js。使用支持 Web Serial 的桌面 Chrome / Edge，点击“连接设备”并选择本机串口；更换站点后需要重新选择设备。网页仍可校准、修改和保存配置，进入 ISP 后的实际烧录仍使用烧录工具。

依据：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Web Serial 使用说明](https://developer.chrome.com/docs/capabilities/serial)。

### Cloudflare Pages

使用 Cloudflare Pages 连接本仓库时，可按以下配置部署：

| 设置 | 值 |
| --- | --- |
| Framework preset | None |
| 项目根目录 | 仓库根目录 |
| Build command | `exit 0` |
| Build output directory | `host` |

部署后访问站点根路径；`server.mjs` 仅用于本地启动，无需在 Pages 上运行。也可只上传 `host/index.html`、`host/assets/` 和 `host/firmware/latest.hex`，保持目录结构。

上述设置对应 [Cloudflare Pages 静态 HTML 部署文档](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)。本地服务器的下载响应头不会自动带到静态托管环境，更新固件时需同时检查托管平台缓存。此仓库提供部署说明，不代表已经部署了在线站点。

## 编译固件

已验证的工具链为 Arduino CLI 1.2.0、CH55xDuino 0.0.16、SDCC build.13407。先安装 [CH55xDuino 开发板支持](https://github.com/DeqingSun/ch55xduino)，在项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build_firmware.ps1
```

脚本优先查找 PATH 中的 `arduino-cli`，随后尝试 Arduino IDE 默认安装位置。自定义位置可通过 `-ArduinoCli` 指定。输出为 `firmware/build/onekeyhall-ch552-24mhz.hex`，编译中间文件位于 `tmp/`；脚本不连接或烧录设备。

Arduino IDE 也默认启用 ISP，配置如下：

| 项目 | 值 |
| --- | --- |
| Sketch | `firmware/firmware.ino` |
| 开发板 | CH552 Board |
| Clock Source | 24 MHz (internal), 5V |
| USB Settings | USER CODE w/ 266B USB ram |
| Upload method | USB |

### V2.6.1 内存占用

| 区域 | 当前占用 |
| --- | --- |
| 应用 Flash | 14312 / 14336 字节，剩余 24 字节 |
| 应用 XRAM | 458 / 758 字节，剩余 300 字节 |
| USB XRAM 预留 | 266 字节；加上应用共 724 / 1024 字节 |
| 内部 RAM 栈区域 | 从 `0x47` 开始，可用区域 185 字节，非运行时峰值测量 |
| 配置持久化 | 128 字节 DataFlash，含 CRC |

数据来自当前构建的 [内存报告](firmware/build/memory-usage.txt)，校验信息见 [verification.json](firmware/build/verification.json)。

## 测试与限制

完整主机测试需要 Python 3、GCC 和 Node.js：

```powershell
python scripts/run_tests.py
```

脚本可自动查找 PATH 或本机 CLion 中的 GCC，也可用环境变量 `CC` 指定。只运行网页测试时：

```powershell
npm --prefix host test
```

当前验证包括 CH552 目标编译、40 组固件逻辑测试、USB / ROM / 文本输入测试及 55 项 Node 测试。测试不连接真实设备。完整 V2.6.1 的实机验证状态见版本说明，主机测试不等于实际 ADC、USB 枚举或触控应用验证。

- 行程是两点 ADC 校准得到的相对百分比，不是毫米测量；磁铁位移与磁场不一定线性。
- 采样采用主循环时间检查，不应将网页刷新率或 1 ms 采样间隔理解为实测输入延迟。
- 累计释放次数为 16 位，65535 后回到 0；在线性模式下同样统计有效释放，保存配置后才断电保留。
- 网页键盘测试无法区分不同物理键盘，也无法保证接收被系统拦截的快捷键。

## 项目结构

```text
oneKeyHall/
├── .github/workflows/      GitHub Pages 自动部署
├── firmware/
│   ├── firmware.ino       固件入口（与 Arduino sketch 目录同名）
│   ├── src/               固件模块与 USB 驱动
│   └── build/              默认 ISP 固件、内存和验证报告
├── host/
│   ├── index.html          网页控制台入口
│   ├── assets/             界面、串口协议、测试页与指令表
│   ├── firmware/latest.hex 网页提供下载的固件
│   └── server.mjs          本地静态服务器
├── hardware/               原理图与芯片资料
├── 3D/                     结构设计与打印文件
├── scripts/                编译、测试与故障取证工具
├── tests/                  固件和网页回归测试
└── docs/                   协议、版本与排查文档
```

## 许可证

oneKeyHall 的自有项目代码采用 **GNU GPL 第 3 版**（SPDX：`GPL-3.0-only`），完整条款见 [LICENSE](LICENSE)。适用范围包括本项目原创的固件、Web 控制台、脚本和测试代码，以及维护者有权许可的修改部分。

第三方代码保留其原有版权和许可声明；硬件/结构设计文件、芯片资料及 BootLoader 测试样本不因本声明而改用 GPL。来源、许可文本及尚待确认的材料见 [第三方声明](THIRD_PARTY_NOTICES.md)。

## 相关资料

- [Web 控制台说明](host/README.md)
- [串口指令与配置字节定义](docs/HALL_PROTOCOL.md)；网页导航也提供中英文“串口指令表”入口。
- [V2.6.1 更新说明](docs/RELEASE_2.6.1.md)
- [V2.6.1 发布检查与待确认项](docs/RELEASE_CHECK.md)
- [线性模式说明](docs/LINEAR_MODE.md)

本项目由 onekeyboard 单键键盘改造为霍尔磁轴方案，网页样式参考 [原版控制台](https://onekeyboard.aibozhineng.com/)，固件使用 CH55xDuino 相关实现。源码中的原有版权与许可声明予以保留。
