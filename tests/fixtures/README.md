# CH552 BootLoader parser fixtures

Only 0x3800–0x3FEF is included (2032 bytes each); factory UID/config bytes are excluded. These files are test input and must never be flashed.

Public original-ROM samples used to validate the read-only version parser:

- [2.31 source](https://github.com/usbman01/WCH-8-Bit-x51-controllers/blob/master/bootloaders/original/ch552/loaderv2_31.c): `ch552-boot-2.31.bin`, SHA256 `eb44b53e7a52e502bc9384812035e0ee39e7f0a55529d0ce894a190a3c68c55a`.
- [2.40 source](https://github.com/usbman01/WCH-8-Bit-x51-controllers/blob/master/bootloaders/original/ch552/loaderv2_40.c): `ch552-boot-2.40.bin`, SHA256 `63fdc898c3906c3b87da5116583710e47426d6fc0568b80d5a7420fb194ea64f`.
- [2.50 source](https://embdev.net/attachment/570249/org_v25.hex): `ch552-boot-2.50.bin`, SHA256 `110c3a89c00fb39a3c80db4d0a859a9674da00765ec2b45405dc1e499b3c1499`.

2.50 source discussion: https://www.mikrocontroller.net/topic/462538?page=4#7196924 . The parser uses the A7 version record following the 18-byte ISP device and 32-byte configuration descriptors, not USB bcdDevice. The 2.31 sample reports bcdDevice 1.00 but its A7 record is 00 02 03 01. Unknown layouts return an unknown version. No claim is made that these fixtures were read from the user’s device.
