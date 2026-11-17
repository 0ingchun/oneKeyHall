#ifndef ONEKEYHALL_CHIP_INFO_H
#define ONEKEYHALL_CHIP_INFO_H
#include <stdint.h>
#ifndef __SDCC
#define __xdata
#define __code
#endif
// Bootloader version in BCD low/high; five UID bytes (3FFC..3FFF, then 3FFA).
extern __xdata uint8_t chipInfo[7];
void chip_read_info(void);
#endif
