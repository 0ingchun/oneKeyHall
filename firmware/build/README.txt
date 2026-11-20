oneKeyHall - default release (ISP enabled)
Current release identity: docs/CURRENT_RELEASE.md (generated at build time).

CH552 / 24 MHz internal / 5V / USER USB RAM 266B.
Config V06: 137 bytes on wire, 128 bytes DataFlash including CRC.
Current source: firmware. Usage: README.md.
Manual ISP enabled; automatic 1200-baud entry disabled.
Preserve DataFlash when upgrading to retain calibration/name/settings.
WCHISPTool options and first-flash/upgrade steps: README.md, Quick start / Flash firmware.
Compile/host-model validation only; not flashed or hardware verified.
Prior host shutdown cause remains unresolved.

Release file: onekeyhall-ch552-24mhz.hex
Build: powershell -ExecutionPolicy Bypass -File scripts/build_firmware.ps1
Arduino IDE builds also support manual ISP.
Build also synchronizes host/firmware/latest.hex and generated web release metadata.
Before publishing: node scripts/sync-release.mjs --check
Only the current HEX, this README, memory-usage.txt and verification.json are retained here.
Compiler intermediate outputs are generated under tmp/ and can be deleted after building.

Factory reset: command 15 clears all settings/calibration/count and saves verified defaults.
