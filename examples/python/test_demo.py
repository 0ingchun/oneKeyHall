# SPDX-License-Identifier: GPL-3.0-only
import json
import unittest
from onekeyhall_demo import OneKeyHall, DeviceError, name_changes


class FakeSerial:
    def __init__(self):
        self.config = [0] * 137
        self.config[0] = 6
        self.config[13] = 128
        self.pending = bytearray()
        self.requests = []
        self.closed = False
        self.session = 0
        self.fail = None
        self.silent = False
        self.fragment = 7

    @property
    def in_waiting(self):
        return min(self.fragment, len(self.pending))

    def write(self, data):
        key, value = map(int, data.decode()[1:-1].split(':'))
        self.requests.append((key, value))
        frame = [1000, value if key == 999 else key, 0]
        if (key, value) == self.fail:
            frame[2] = 2
        elif key == 999:
            if value == 1:
                frame = self.config[:]
            elif value == 3:
                frame = [1001, 100, 100, 0, 0, 1, 1, self.session, 93, 0, 0, 0, 0]
            elif value == 4:
                frame = [1002, 255]
            elif value == 5:
                frame = [1003, 2, 6, 1, 1]
            elif value == 6:
                frame = [1004, 0x50, 2, 0x32, 0x42, 0xd1, 0xbe, 0]
            elif value == 10:
                self.backup = self.config[:]
                self.session = 1
            elif value == 14:
                self.config = self.backup[:]
                self.session = 0
            elif value in (0, 13):
                self.session = 0
        else:
            self.config[key] = value
        if not self.silent:
            # Garbage, bad JSON and unrelated telemetry must not count as ACKs.
            self.pending.extend(b'noise[bad][1001,1,2]\n' + json.dumps(frame).encode() + b'\n')
        return len(data)

    def read(self, size):
        data = self.pending[:size]
        del self.pending[:size]
        return bytes(data)

    def close(self):
        self.closed = True


class DemoTests(unittest.TestCase):
    def test_read_only_and_single_byte_fragments(self):
        port = FakeSerial()
        port.fragment = 1
        info = OneKeyHall(port).info()
        self.assertEqual(info['bootloader'], '2.50')
        self.assertEqual(info['name'], 'oneKeyHall3242D1BE00')
        self.assertEqual(port.requests, [(999, 1), (999, 5), (999, 4), (999, 6)])

    def test_apply_and_explicit_save(self):
        for save in (False, True):
            port = FakeSerial()
            result = OneKeyHall(port).configure({13: 80}, save=save)
            self.assertEqual(result[13], 80)
            self.assertEqual(port.requests, [(999, 1), (999, 3), (999, 10),
                                             (13, 80), (999, 0 if save else 13), (999, 1)])

    def test_commit_rejection_rolls_back(self):
        port = FakeSerial()
        port.fail = (999, 13)
        with self.assertRaises(DeviceError):
            OneKeyHall(port).configure({13: 80})
        self.assertEqual(port.config[13], 128)
        self.assertEqual(port.requests[-1], (999, 14))
        self.assertNotIn((999, 0), port.requests)

    def test_timeout_closes_and_never_retries(self):
        port = FakeSerial()
        port.silent = True
        device = OneKeyHall(port, timeout=0.01)
        with self.assertRaises(TimeoutError):
            device.ack(999, 13)
        with self.assertRaises(RuntimeError):
            device.config()
        self.assertTrue(port.closed)
        self.assertEqual(port.requests, [(999, 13)])

    def test_short_write_closes(self):
        port = FakeSerial()
        port.write = lambda data: 1
        with self.assertRaises(OSError):
            OneKeyHall(port).config()
        self.assertTrue(port.closed)

    def test_readonly_fields_and_bad_values_do_not_send(self):
        for changes in ({0: 6}, {89: 1}, {999: 99}, {13: 256}, {7: 1}):
            port = FakeSerial()
            with self.assertRaises(ValueError):
                OneKeyHall(port).configure(changes)
            self.assertEqual(port.requests, [])

    def test_existing_session_is_not_overwritten(self):
        port = FakeSerial()
        port.session = 1
        with self.assertRaises(RuntimeError):
            OneKeyHall(port).configure({13: 80})
        self.assertNotIn((999, 10), port.requests)

    def test_names(self):
        changes = name_changes('磁轴')
        self.assertEqual(changes[6], 2)
        self.assertEqual(bytes(changes[i] for i in range(100, 104)).decode('utf-16le'), '磁轴')
        self.assertEqual(sum(name_changes('').values()), 0)
        for invalid in ('x' * 13, '\n', '😀'):
            with self.assertRaises(ValueError):
                name_changes(invalid)


if __name__ == '__main__':
    unittest.main()
