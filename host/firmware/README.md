# 最新固件发布位置

把希望提供下载的固件 HEX 文件命名为 `latest.hex`，放在本目录，覆盖旧文件即可。无需改网页；本地服务每次读取文件，响应禁用缓存。发布时可先复制为临时文件，再替换 `latest.hex`，避免下载到正在复制的文件。

- 页面入口：固件更新 → 下载最新固件（HEX）。无需连接键盘。
- 固定地址：http://127.0.0.1:5173/firmware/latest.hex
- 浏览器保存名：`oneKeyHall-latest.hex`。
- 这里的“最新”是你手动放入的文件，不会扫描构建目录或按文件名推断版本。
- 首次安装下载入口后，重新启动 `host/start.cmd` 并刷新页面；以后仅替换 HEX 不需重启。
- 本地服务只开放本目录的 `latest.hex`；其他文件和目录不提供下载。

当前发布文件复制自 `firmware/build/onekeyhall-ch552-24mhz.hex`（V2.6.1，默认支持 ISP，CH552 / 24 MHz / 5V）。后续替换时应同步更新此处版本说明，并核对文件哈希。编译不会自动覆盖本发布目录，由你选择要发布的固件。

按钮仅下载文件，不连接串口、不进入 ISP、不烧录。本版固件仍需按更新说明完成实机验证。若以后把网页部署到其他服务器，保持相对于站点入口的 `firmware/latest.hex` 路径即可。GitHub Pages 项目地址示例为 `https://0ingchun.github.io/oneKeyHall/firmware/latest.hex`，部署成功后可访问；上述 127.0.0.1 地址仅供本地服务使用。

当前 V2.6.1 文件 SHA-256：`a39243caf0e86fa66dc6659c091f4003d673730ac7ba3e66eeb82560cfef9b2a`。对应 [构建验证报告](../../firmware/build/verification.json)。
