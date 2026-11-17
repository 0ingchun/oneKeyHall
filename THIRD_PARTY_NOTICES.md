# 第三方来源与许可证范围

oneKeyHall 自有项目代码按 [GNU GPL 第 3 版](LICENSE)（`GPL-3.0-only`）提供。本声明仅适用于维护者有权许可的原创代码和修改部分，不替代第三方原有许可，也不表示已取得下列所有材料的再分发授权。

## CH55xDuino 与 WS2812

- 上游：[DeqingSun/ch55xduino](https://github.com/DeqingSun/ch55xduino)。
- 上游许可：[LICENSE](https://github.com/DeqingSun/ch55xduino/blob/ch55xduino/LICENSE)，本地完整副本为 [licenses/LGPL-2.1.txt](licenses/LGPL-2.1.txt)。
- 本项目使用 CH55xDuino 构建工具链，并包含其相关 USB / WS2812 实现；固件构建版本及配置见 README。
- `firmware/src/userUsbHidKeyboard/WS2812.c`、`WS2812.h` 和 `template/` 内带许可头的 WS2812 文件，原声明允许选择 GPL 第 2 版或 LGPL 第 2.1 版。本项目对这些第三方部分采用其 LGPL 第 2.1 版选项，保留原有双许可声明。
- 原文件标注的作者包括 Deqing Sun、Stephen Erisman；具体作者及适用范围以各文件原声明为准。未将这些文件的原始版权归属改为 oneKeyHall。

## 原版 onekeyboard

本项目从 onekeyboard 单键键盘改造而来，网页样式参考 [原版控制台](https://onekeyboard.aibozhineng.com/)。原版代码及结构文件的完整许可尚未在当前仓库中核实；须确认原作者对相关内容修改与再分发的许可，并补充来源及原始声明。项目 GPL 声明不替代这项授权。

## 非项目原创代码材料

| 内容 | 范围与状态 |
| --- | --- |
| `hardware/`、`3D/` | 包含原理图、芯片手册和结构设计。项目代码许可证不自动适用于这些文件，尤其不覆盖厂商手册及原版结构文件。 |
| `tests/fixtures/ch552-boot-*.bin` | 公开 ROM 样本，仅用于只读解析测试，不随应用 HEX 烧录。来源与哈希见 [样本说明](tests/fixtures/README.md)；再分发许可仍待确认。 |

第三方材料的公开下载地址只是来源记录，不等同于许可证。尚未确认的部分继续列在 [发布检查](docs/RELEASE_CHECK.md) 中。

## 许可文本来源

- `LICENSE`：GNU 官方 [GPL-3.0 全文](https://www.gnu.org/licenses/gpl-3.0.txt)，按原文保存。
- `licenses/LGPL-2.1.txt`：上述 CH55xDuino 上游 LICENSE，按原文保存。
