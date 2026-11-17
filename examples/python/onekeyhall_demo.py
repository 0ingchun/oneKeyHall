#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Synchronous oneKeyHall V06 serial demo. No hardware is opened on import."""
import argparse
import json
import sys
import time


ERRORS = {1: '操作顺序或写入目标错误', 2: '参数组合不合法',
          3: '采样不稳定', 4: '校准跨度不足', 5: 'DataFlash 回读失败，保存未确认'}
STATUS_FIELDS = ('raw', 'filtered', 'position', 'pressed', 'calibrated',
                 'armed', 'settingsOpen', 'span', 'fault', 'extreme', 'cycle', 'reversed')


class DeviceError(RuntimeError):
    """A matched negative ACK: the transport is still synchronized."""


class OneKeyHall:
    """One outstanding request at a time; do not share across threads."""

    def __init__(self, transport, timeout=2.5):
        self.port = transport
        self.timeout = timeout
        self.closed = False

    @classmethod
    def open(cls, port):
        import serial
        # Configure before opening; never use the legacy 1200 baud trigger.
        transport = serial.Serial(port=None, baudrate=57600, timeout=0.05,
                                  write_timeout=2.5)
        transport.dtr = True
        transport.rts = False
        transport.port = port
        try:
            transport.open()
            transport.reset_input_buffer()
        except BaseException:
            transport.close()
            raise
        return cls(transport)

    def close(self):
        self.closed = True
        self.port.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def request(self, key, value, match):
        if self.closed:
            raise RuntimeError('串口已关闭，请重新连接')
        if any(type(n) is not int or not 0 <= n <= 999 for n in (key, value)):
            raise ValueError('协议 key/value 必须是 0–999 的整数')
        data = f'{{{key}:{value}}}'.encode('ascii')
        buffer = bytearray()
        try:
            deadline = time.monotonic() + self.timeout
            if self.port.write(data) != len(data):
                raise OSError('串口未完整写入请求')
            while time.monotonic() < deadline:
                chunk = self.port.read(min(256, max(1, self.port.in_waiting)))
                for byte in chunk:
                    if byte == ord('['):
                        buffer = bytearray(b'[')
                    elif buffer:
                        buffer.append(byte)
                        if len(buffer) > 4096:
                            buffer.clear()
                        elif byte == ord(']'):
                            try:
                                frame = json.loads(buffer)
                            except (ValueError, UnicodeError):
                                frame = None
                            buffer.clear()
                            if (isinstance(frame, list) and
                                    all(type(n) is int for n in frame) and match(frame)):
                                return frame
            raise TimeoutError('设备响应超时，结果未确认；连接已关闭，不自动重试')
        except BaseException:
            # A late ACK must never be mistaken for the next request's ACK.
            self.close()
            raise

    def ack(self, key, value):
        target = value if key == 999 else key
        frame = self.request(key, value, lambda f: len(f) == 3 and f[:2] == [1000, target])
        if frame[2]:
            raise DeviceError(f'{target}: {ERRORS.get(frame[2], "设备拒绝请求")} ({frame[2]})')

    def config(self):
        frame = self.request(999, 1, lambda f: len(f) >= 89 and 0 <= f[0] < 255)
        if len(frame) != 137 or frame[0] != 6 or any(not 0 <= v <= 255 for v in frame):
            raise ValueError('此 demo 要求 oneKeyHall 配置格式 V06（137 字节）')
        return frame

    def status(self):
        frame = self.request(999, 3, lambda f: len(f) in (10, 12, 13) and f[0] == 1001)
        return dict(zip(STATUS_FIELDS, frame[1:]))

    def query(self, command, tag, length):
        frame = self.request(999, command, lambda f:
                             (len(f) == length and f[0] == tag and
                              all(0 <= v <= 255 for v in f[1:])) or
                             (len(f) == 3 and f[:2] == [1000, command]))
        if frame[0] == 1000:
            raise DeviceError(f'设备未提供查询 {command}，状态 {frame[2]}')
        return frame[1:]

    def info(self):
        config = self.config()
        version = self.query(5, 1003, 5)
        capabilities = self.query(4, 1002, 2)[0]
        identity = self.query(6, 1004, 8) if capabilities & 32 else None
        uid = ''.join(f'{b:02X}' for b in identity[2:]) if identity else None
        boot = None
        if identity:
            lo, hi = identity[:2]
            if 1 <= hi <= 9 and lo >> 4 <= 9 and lo & 15 <= 9:
                boot = f'{hi}.{lo >> 4}{lo & 15}'
        if config[6] > 12:
            raise ValueError('设备名称长度无效')
        name = bytes(config[100:100 + config[6] * 2]).decode('utf-16le')
        return {'firmware': '.'.join(map(str, version[:3])), 'bootloader': boot,
                'capabilities': f'0x{capabilities:02X}', 'uid': uid,
                'name': name or (f'oneKeyHall{uid}' if uid else None),
                'release_count': config[2] * 256 + config[3], 'config': config}

    def configure(self, changes, save=False):
        """Begin -> writes with ACK -> apply/save -> readback. Device validates combinations."""
        for index, value in changes.items():
            if (type(index) is not int or not 4 <= index < 137 or
                    7 <= index <= 9 or 89 <= index <= 91):
                raise ValueError(f'不可写入的配置索引: {index}')
            if type(value) is not int or not 0 <= value <= 255:
                raise ValueError(f'配置 {index} 必须是 0–255 的整数')
        before = self.config()  # Reject incompatible firmware before any mutation.
        if self.status()['settingsOpen']:
            raise RuntimeError('设备仍在设置会话中，请先在原控制程序结束会话')
        self.ack(999, 10)
        try:
            for index, value in sorted(changes.items()):
                if before[index] != value:
                    self.ack(index, value)
            self.ack(999, 0 if save else 13)
        except DeviceError:
            # Only matched device errors allow rollback on the same stream.
            # A storage failure may have partially written Flash; rollback is RAM only.
            try:
                self.ack(999, 14)
            except Exception:
                self.close()
            raise
        after = self.config()
        if any(after[index] != value for index, value in changes.items()):
            raise RuntimeError('配置回读不一致；请重新连接核对，未自动重试')
        return after


def name_changes(name):
    if len(name) > 12 or any(ord(c) < 32 or 127 <= ord(c) < 160 or
                             0xd800 <= ord(c) <= 0xdfff or ord(c) > 0xffff for c in name):
        raise ValueError('设备名称最多 12 个 BMP 字符，不能含控制字符或 emoji')
    encoded = name.encode('utf-16le').ljust(24, b'\0')
    return {6: len(name), **{100 + i: b for i, b in enumerate(encoded)}}


def main():
    parser = argparse.ArgumentParser(description='oneKeyHall V06 串口读写 demo')
    parser.add_argument('--port', help='串口，例如 COM5 或 /dev/ttyACM0')
    sub = parser.add_subparsers(dest='action')
    sub.add_parser('ports', help='列出串口，不打开设备')
    sub.add_parser('read', help='只读设备信息与全部配置（默认）')
    status = sub.add_parser('status', help='读取实时状态')
    status.add_argument('--watch', action='store_true', help='每 0.1 秒查询，Ctrl+C 退出')
    write = sub.add_parser('write', help='修改配置，默认仅应用 RAM')
    write.add_argument('--set', action='append', default=[], metavar='INDEX=VALUE')
    write.add_argument('--name', help='自定义名称；空字符串恢复自动名称')
    write.add_argument('--save', action='store_true', help='明确写入 DataFlash，断电保留')
    args = parser.parse_args()
    if args.action == 'ports':
        from serial.tools import list_ports
        for p in list_ports.comports():
            marker = ' [oneKeyHall VID/PID]' if (p.vid, p.pid) == (0x1209, 0xc550) else ''
            print(f'{p.device}: {p.description}{marker}')
        return
    if not args.port:
        parser.error('请用 --port 明确选择设备；可先运行 ports')
    changes = {}
    if args.action == 'write':
        for pair in args.set:
            index, value = pair.split('=', 1)
            changes[int(index, 0)] = int(value, 0)
        if args.name is not None:
            if any(i == 6 or 100 <= i <= 123 for i in changes):
                parser.error('--name 不能与名称字节的 --set 混用')
            changes.update(name_changes(args.name))
        if not changes and not args.save:
            parser.error('write 至少需要 --set、--name 或 --save')
    with OneKeyHall.open(args.port) as device:
        if args.action == 'write':
            result = device.configure(changes, save=args.save)
            print('已保存，断电保留。' if args.save else '已应用 RAM，断电恢复上次保存的配置。')
            print('请完全松开轴体；USB 名称需保存后重新插拔生效。')
        elif args.action == 'status':
            while True:
                print(json.dumps(device.status(), ensure_ascii=False), flush=True)
                if not args.watch:
                    return
                time.sleep(0.1)
        else:
            result = device.info()
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n已停止。', file=sys.stderr)
        sys.exit(130)
    except Exception as error:
        print(f'错误: {error}', file=sys.stderr)
        sys.exit(1)
