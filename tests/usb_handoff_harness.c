/* Host substitutes for SFRs. The runner inserts the production handoff below. */
#include <assert.h>
#include <stdint.h>
#include <setjmp.h>
#include <stdio.h>
#define BOOT_LOAD_ADDR 0x3800
#define bUC_RESET_SIE 0x04
#define bUC_CLR_ALL 0x02
static uint8_t EA, USB_INT_EN, USB_CTRL, USB_DEV_AD, TMOD;
static unsigned delayTotal, delayCalls, entries;
static jmp_buf bootExit;
// CH552 BootLoader 2.50: ORL TMOD,#1; reload 0x64C0; count 1250..1500.
// Timer ticks only, excluding polling/USB work. Evidence: docs/ISP_INCIDENT.md.
static uint32_t boot250TimeoutTicks(uint8_t inheritedMode) {
    uint8_t mode = (inheritedMode | 1) & 3;
    assert(mode == 1 || mode == 3);
    return (mode == 1 ? 65536UL - 0x64C0 : 256UL - 0xC0) * 250UL;
}
void delayMicroseconds(uint16_t us) {
    assert(!EA && !USB_INT_EN && USB_CTRL == 0x06 && USB_DEV_AD == 0);
    delayTotal += us; ++delayCalls;
}
static void testBootEntry(void) {
    assert(!EA && !USB_INT_EN && USB_CTRL == 0x06 && USB_DEV_AD == 0);
    assert(delayTotal == 100000 && delayCalls == 2);
    assert(TMOD == 0);
    // Model the mode-selection operation present in some CH552 loaders.
    // Retaining Arduino mode 2 would produce split mode 3 instead of mode 1.
    assert(((TMOD | 0x01) & 0x03) == 0x01);
    assert(boot250TimeoutTicks(TMOD) == 9936000UL);
    ++entries;
    longjmp(bootExit, 1);
}
#define __asm__(instruction) testBootEntry()
