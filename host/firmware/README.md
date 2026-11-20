# 最新固件发布位置

本目录的 `latest.hex` 由 `scripts/build_firmware.ps1` 在成功构建后自动复制，同时生成网页版本数据 `host/assets/release.mjs` 和[当前发布信息](../../docs/CURRENT_RELEASE.md)。无需手动改网页版本或应答示例。

- 页面入口：固件更新 → 下载最新固件（HEX），旁边显示发布版本。
- 固定下载路径：`firmware/latest.hex`，兼容 GitHub Pages 项目子路径。
- 下载文件名：`oneKeyHall-应用版本.hex`，由发布信息生成。
- 串口连接区的固件版本来自设备实际应答，与网站提供下载的版本分开显示。

使用其他方式编译时，将 HEX 放到 `firmware/build/onekeyhall-ch552-24mhz.hex`，从项目根目录运行 `node scripts/sync-release.mjs --write`。脚本验证 HEX 中的版本应答和能力值与源码一致后，再同步发布文件。

发布前运行 `node scripts/sync-release.mjs --check`。GitHub Pages 部署工作流自动执行同一检查，拒绝未同步的版本数据或 HEX。哈希使用解码后的应用镜像，不受 Windows/Linux 换行差异影响。源码版本号在 `firmware/src/FirmwareVersion.h` 中维护。

构建和同步只更新本地文件，不会自动提交、推送、部署或烧录设备。功能最低支持版本和历史版本说明保留原值。更改版本模块后重启本地服务，前端更新后刷新页面。
