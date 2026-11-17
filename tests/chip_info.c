#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <assert.h>
#include "ChipInfo.h"
uint8_t chipRom[0x4000];
int main(int argc, char **argv) {
    assert(argc == 4);
    const uint8_t expected[] = {0x31, 0x40, 0x50};
    const unsigned descriptor[] = {0x3e76, 0x3e8e, 0x3e90};
    for (unsigned i = 0; i < 3; ++i) {
        memset(chipRom, 255, sizeof(chipRom));
        FILE *file = fopen(argv[i+1], "rb"); assert(file);
        assert(fread(chipRom+0x3800, 1, 2032, file) == 2032); fclose(file);
        memcpy(chipRom+0x3ffc, "\x32\x42\xd1\xbe", 4); chipRom[0x3ffa] = 0xa5;
        chip_read_info(); assert(chipInfo[0] == expected[i] && chipInfo[1] == 2);
        assert(!memcmp(chipInfo+2, "\x32\x42\xd1\xbe\xa5", 5));
        // 2.31 has bcdDevice 1.00; the version must come from the A7 record.
        if (!i) assert(chipRom[descriptor[i]+12] == 0 && chipRom[descriptor[i]+13] == 1);
        chipRom[descriptor[i]+53] = 0xff; chip_read_info(); assert(!chipInfo[0] && !chipInfo[1]);
        chipRom[descriptor[i]+53] = expected[i] & 15;
        chipRom[descriptor[i]+19] = 3; chip_read_info(); assert(!chipInfo[0] && !chipInfo[1]);
    }
    memset(chipRom, 0, sizeof(chipRom)); chip_read_info(); assert(!chipInfo[0] && !chipInfo[1]);
    memset(chipRom, 255, sizeof(chipRom)); chip_read_info(); assert(!chipInfo[0] && !chipInfo[1]);
    puts("PASS boot ROM 2.31/2.40/2.50 fixtures, invalid signatures/version, unknown layout and 40-bit UID order");
}
