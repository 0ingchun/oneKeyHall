#include "ChipInfo.h"
__xdata uint8_t chipInfo[7];
#ifdef __SDCC
#define ROM(address) (*((const __code uint8_t *)(address)))
#else
extern uint8_t chipRom[0x4000];
#define ROM(address) chipRom[address]
#endif
void chip_read_info(void) {
    uint16_t address;
    uint8_t i, major, minor, patch;
    static const __code uint8_t signature[] = {18,1,0x10,1,0xff,0x80,0x55,8,0xe0,0x55,9,2,32,0,0};
    static const __code uint8_t offsets[] = {0,1,2,3,4,5,6,7,10,11,18,19,20,21,50};
    chipInfo[0] = chipInfo[1] = 0;
    for (i = 0; i < 5; ++i) chipInfo[2 + i] = ROM(i == 4 ? 0x3ffa : 0x3ffc + i);
    // Read only: locate the ISP descriptor followed by the A7 version record.
    // bcdDevice alone is NOT reliable (factory 2.31 uses USB revision 1.00).
    // No ISP jump and no fixed ROM offset/version. Unrecognized layout = 0.
    for (address = 0x3800; address <= 0x3fba; ++address) {
        for (i = 0; i < sizeof(signature); ++i) if (ROM(address + offsets[i]) != signature[i]) break;
        if (i != sizeof(signature)) continue;
        if (!((ROM(address + 8) == 0x48 && ROM(address + 9) == 0x43) ||
              (ROM(address + 8) == 0x86 && ROM(address + 9) == 0x1a))) continue;
        major = ROM(address + 51); minor = ROM(address + 52); patch = ROM(address + 53);
        if (major > 0 && major <= 9 && minor <= 9 && patch <= 9) {
            chipInfo[0] = (minor << 4) | patch;
            chipInfo[1] = major;
            break;
        }
    }
}
