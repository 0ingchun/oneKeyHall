"""Compile production firmware logic with host doubles, then run web protocol tests."""
from pathlib import Path
import os
import re
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
out = root / 'tmp' / 'host-tests'
out.mkdir(parents=True, exist_ok=True)
gcc = os.environ.get('CC') or shutil.which('gcc')
if not gcc:
    candidates = sorted(Path('C:/Program Files/JetBrains').glob('CLion*/bin/mingw/bin/gcc.exe'))
    gcc = str(candidates[-1]) if candidates else None
if not gcc:
    raise SystemExit('GCC is required for the host firmware tests; set CC to its executable path.')
os.environ['PATH'] = str(Path(gcc).parent) + os.pathsep + os.environ.get('PATH', '')
sketch = (root / 'firmware/firmware.ino').read_text(encoding='utf-8')
sketch = re.sub(r'^#include .*$', '', sketch, flags=re.M)
source = '\n'.join([(root / 'tests/firmware_harness.c').read_text(encoding='utf-8'), sketch,
                    (root / 'tests/firmware_cases.c').read_text(encoding='utf-8').replace('/* NATIVE_LINEAR_CASES */', (root / 'tests/linear_cases.c').read_text(encoding='utf-8')).replace('/* IDENTITY_LIGHT_CASES */', (root / 'tests/identity_light_cases.c').read_text(encoding='utf-8')).replace('/* LINEAR_REVERSE_CASES */', (root / 'tests/linear_reverse_cases.c').read_text(encoding='utf-8')).replace('/* FACTORY_RESET_CASES */', (root / 'tests/factory_reset_cases.c').read_text(encoding='utf-8'))])
(out / 'firmware_test.c').write_text(source, encoding='utf-8')
binary = out / ('firmware_test' + ('.exe' if os.name == 'nt' else ''))
subprocess.run([gcc, '-std=c11', '-Wall', '-Wextra', '-Werror', '-O1',
                '-I' + str(root / 'firmware/src'), str(out / 'firmware_test.c'),
                str(root / 'firmware/src/HallEngine.c'), str(root / 'firmware/src/LinearEngine.c'), str(root / 'firmware/src/ChipInfo.c'), '-o', str(binary)], check=True)
subprocess.run([str(binary)], check=True)
chip_binary = out / ('chip_info.exe' if os.name == 'nt' else 'chip_info')
subprocess.run([gcc, '-std=c11', '-Wall', '-Wextra', '-Werror', '-O1',
    '-I' + str(root / 'firmware/src'), str(root / 'tests/chip_info.c'),
    str(root / 'firmware/src/ChipInfo.c'), '-o', str(chip_binary)], check=True)
subprocess.run([str(chip_binary), *[str(root / f'tests/fixtures/ch552-boot-{v}.bin') for v in ('2.31', '2.40', '2.50')]], check=True)
cdc = (root / 'firmware/src/userUsbHidKeyboard/USBCDC.c').read_text(encoding='utf-8')
handoff = cdc[cdc.index('void USBEnterBootloader(void)'):cdc.index('\nvoid resetCDCParameters')]
handoff_source = '\n'.join([(root / 'tests/usb_handoff_harness.c').read_text(encoding='utf-8'),
                            handoff, (root / 'tests/usb_handoff_cases.c').read_text(encoding='utf-8')])
(out / 'usb_handoff_test.c').write_text(handoff_source, encoding='utf-8')
handoff_binary = out / ('usb_handoff_test.exe' if os.name == 'nt' else 'usb_handoff_test')
subprocess.run([gcc, '-std=c11', '-Wall', '-Wextra', '-Werror', '-O1',
                str(out / 'usb_handoff_test.c'), '-o', str(handoff_binary)], check=True)
subprocess.run([str(handoff_binary)], check=True)
handler = (root / 'firmware/src/userUsbHidKeyboard/USBhandler.c').read_text(encoding='utf-8')
constants = (root / 'firmware/src/userUsbHidKeyboard/USBconstant.c').read_text(encoding='utf-8')
constants = re.sub(r'^#include .*$', '', constants, flags=re.M)
# SDCC permits sizeof a later array definition; give GCC equivalent sized declarations.
for array in ('CfgDesc', 'ReportDesc'):
    initializer = re.search(r'uint8_t ' + array + r'\[\]\s*=\s*\{(.*?)\};', constants, re.S).group(1)
    initializer = re.sub(r'//[^\n]*', '', initializer)
    count = len([item for item in initializer.split(',') if item.strip()])
    constants = f'extern uint8_t {array}[{count}];\n' + constants
name_code = handler[handler.index('const uint8_t *pDescr;'):handler.index('inline void NOP_Process')]
setup_code = handler[handler.index('case USB_GET_DESCRIPTOR:'):handler.index('case USB_SET_ADDRESS:')]
class_code = handler[handler.index('switch( ( UsbSetupBuf->bRequestType'):handler.index('\n        }\n        else ', handler.index('switch( ( UsbSetupBuf->bRequestType'))]
feature_code = handler[handler.index('case USB_CLEAR_FEATURE:'):handler.index('case USB_GET_STATUS:')]
in_code = handler[handler.index('void USB_EP0_IN()'):handler.index('void USB_EP0_OUT()')]
descriptor_source = '\n'.join([(root / 'tests/usb_descriptors_harness.c').read_text(), constants, 'static uint8_t chipInfo[7] = {0x50,2,0x32,0x42,0xd1,0xbe,0};', name_code,
    'uint8_t descriptorSetup(void) { uint8_t len = 0; uint16_t descrLen = 0; switch(SetupReq) {', setup_code, '} return len; }',
    'uint8_t classSetup(void) { uint8_t len = 0; ' + class_code + ' return len; }',
    'uint8_t featureSetup(void) { uint8_t len = 0; switch(SetupReq) {' + feature_code + '} return len; }',
    in_code, (root / 'tests/usb_descriptors_cases.c').read_text()])
(out / 'usb_descriptors_test.c').write_text(descriptor_source, encoding='utf-8')
descriptor_binary = out / ('usb_descriptors_test.exe' if os.name == 'nt' else 'usb_descriptors_test')
subprocess.run([gcc, '-std=c11', '-Wall', '-Wextra', '-Werror', '-Wno-parentheses', '-O1',
    str(out / 'usb_descriptors_test.c'), '-o', str(descriptor_binary)], check=True)
subprocess.run([str(descriptor_binary)], check=True)
hid = (root / 'firmware/src/userUsbHidKeyboard/USBHIDKeyboard.c').read_text()
hid_code = hid[hid.index('uint8_t HIDReady(void)'):hid.index('uint8_t USB_EP3_send(void)')]
hid_source = (root / 'tests/hid_transport.c').read_text().replace('/* PRODUCTION_HID */', hid_code)
(out / 'hid_transport.c').write_text(hid_source)
hid_binary = out / ('hid_transport.exe' if os.name == 'nt' else 'hid_transport')
subprocess.run([gcc, '-std=c11', '-Wall', '-Wextra', '-Werror', '-O1', str(out / 'hid_transport.c'), '-o', str(hid_binary)], check=True)
subprocess.run([str(hid_binary)], check=True)
keyboard_source = (root / 'tests/keyboard_text.c').read_text().replace('/* ASCII_MAP */',
    hid[hid.index('#define SHIFT'):hid.index('typedef void')]).replace('/* KEYBOARD_FUNCTIONS */',
    hid[hid.index('uint8_t Keyboard_press('):])
(out / 'keyboard_text.c').write_text(keyboard_source)
keyboard_binary = out / ('keyboard_text.exe' if os.name == 'nt' else 'keyboard_text')
subprocess.run([gcc, '-std=c11', '-Wall', '-Wextra', '-Werror', '-O1', str(out / 'keyboard_text.c'), '-o', str(keyboard_binary)], check=True)
subprocess.run([str(keyboard_binary)], check=True)
subprocess.run(['node', '--test', *map(str, sorted((root / 'tests').glob('*.test.mjs')))], check=True)
