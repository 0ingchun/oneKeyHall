# Python 串口读写 demo

适用于 oneKeyHall 配置 V06（当前 V2.6.1）。使用 Python 3.9+ 和 pySerial 3.5；Windows、Linux 均可用。运行前先在 Web 控制台断开设备，关闭其他占用该串口的程序。

以下命令均在项目根目录执行，将 `COM5` 换成实际串口；Linux 示例为 `/dev/ttyACM0`。

```powershell
python -m pip install -r examples/python/requirements.txt
python examples/python/onekeyhall_demo.py ports

# 默认只读：固件/BootLoader 版本、UID、设备名称、累计次数、全部配置
python examples/python/onekeyhall_demo.py --port COM5

# 实时 ADC、归一化行程、按下状态、RT 极值等；Ctrl+C 退出
python examples/python/onekeyhall_demo.py --port COM5 status --watch

# 改亮度为 80，仅应用 RAM，不写 Flash
python examples/python/onekeyhall_demo.py --port COM5 write --set 13=80

# 同一设置会话内修改触发点/释放点并保存
python examples/python/onekeyhall_demo.py --port COM5 write --set 92=60 --set 93=40 --save

# 双击窗口 250 ms（配置索引 5 的单位为 10 ms）
python examples/python/onekeyhall_demo.py --port COM5 write --set 5=25 --save

# 改名并保存；重新插拔后 USB 名称生效
python examples/python/onekeyhall_demo.py --port COM5 write --name "我的磁轴" --save

# 保存当前运行配置及累计次数，不修改其他参数
python examples/python/onekeyhall_demo.py --port COM5 write --save
```

`--set` 可重复使用，索引和值支持十进制或 `0x` 十六进制。设备名称最多 12 个 BMP 字符，不支持 emoji；传入空字符串可恢复自动名称。只读字段和保留字节禁止通过 demo 写入。完整参数定义见 [串口协议](../../docs/HALL_PROTOCOL.md)。

写入采用 `10 → 字节写入 → 13（应用）或 0（保存）→ 回读`，每一步等待匹配的 ACK。设备负责验证参数组合；明确拒绝时尝试命令 14 回退 RAM 设置。保存失败可能已部分写入 DataFlash，不能把 RAM 回退理解为撤销 Flash 写入。超时、断开或写入失败会关闭连接，不自动重试；重新连接后核对状态。

开始设置会暂停按键输出，应用后需完全松开轴体才能重新触发。普通读取不进入设置会话。此 demo 不提供校准、恢复出厂或 ISP 命令行入口。客户端为同步单线程设计。

## 在自己的程序里调用

把示例目录加入模块路径，或将自己的脚本放在同一目录：

```python
from onekeyhall_demo import OneKeyHall, name_changes

with OneKeyHall.open("COM5") as device:
    print(device.info())
    print(device.status())
    config = device.configure({13: 80}, save=False)
    print("亮度:", config[13])
    # 需要保存时明确指定 save=True：
    # device.configure(name_changes("oneKeyHall"), save=True)
```

串口为 57600、8N1，DTR 开启，RTS 关闭，无硬件流控；查询应答总超时 2.5 秒。pySerial 接口见 [官方 API 文档](https://pyserial.readthedocs.io/en/latest/pyserial_api.html)。

## 无硬件测试

```powershell
python -m unittest discover -s examples/python -p test_demo.py -v
```

测试使用模拟串口，无需安装 pySerial，不会打开真实串口。覆盖分包/杂帧、只读查询、应用与显式保存、拒绝回退、超时关闭、短写入、参数保护及名称编码；不等于实机验证。本示例采用项目的 [GPL-3.0-only 许可证](../../LICENSE)。
