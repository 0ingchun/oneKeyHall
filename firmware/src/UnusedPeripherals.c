// This board only uses USB CDC (not hardware UART) and polls its Hall ADC.
// Satisfy the core ISR references without linking unused UART ring buffers and
// attachInterrupt support. These peripheral interrupts are never enabled here.
#ifdef __SDCC
void uart0IntRxHandler(void) {}
void uart0IntTxHandler(void) {}
void uart1IntRxHandler(void) {}
void uart1IntTxHandler(void) {}
static void unusedInterrupt(void) {}
typedef void (*InterruptCallback)(void);
__xdata InterruptCallback intFunc[2] = {unusedInterrupt, unusedInterrupt};
#endif
