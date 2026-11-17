#ifndef ONEKEYHALL_HARDWARE_H
#define ONEKEYHALL_HARDWARE_H
// Same CH552 register settings as CH55xduino pinMode(INPUT/OUTPUT) and analogRead,
// specialized to this board to avoid linking unused GPIO/PWM/UART abstractions.
static void hall_hardware_init(void) {
#ifdef __SDCC
    P1_MOD_OC &= ~0x30;
    P1_DIR_PU = (P1_DIR_PU & ~0x20) | 0x10; // P1.5 high impedance; P1.4 push-pull.
#else
    pinMode(15, INPUT); pinMode(14, OUTPUT);
#endif
}
static uint8_t hall_read_adc(void) {
#ifdef __SDCC
    ADC_CFG = bADC_EN | bADC_CLK;
    ADC_CTRL = (ADC_CTRL & ~0x03) | 0x02; // AIN2 / P1.5
    ADC_START = 1;
    while (ADC_START);
    return ADC_DATA;
#else
    return analogRead(15);
#endif
}
#endif
