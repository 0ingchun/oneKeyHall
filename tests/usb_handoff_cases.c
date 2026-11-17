int main(void) {
    EA = 1; USB_INT_EN = 7; USB_CTRL = 0x29; USB_DEV_AD = 37;
    TMOD = 0x02; // Actual CH55xDuino Timer0 mode at runtime.
    assert(boot250TimeoutTicks(TMOD) == 16000UL); // Reproduce the old mode conflict.
    if (!setjmp(bootExit)) USBEnterBootloader();
    assert(entries == 1);
    puts("PASS production ISP handoff resets USB state and Arduino Timer0 mode before jump (host SFR doubles)");
}
