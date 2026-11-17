#include <stdint.h>
#include <stdio.h>
#include <assert.h>
#include <string.h>
#define __xdata
#define MASK_UEP_T_RES 3
#define UEP_T_RES_ACK 0
static uint8_t UsbConfig, UsbSuspended, HidProtocol = 1, UpPoint3_Busy, Ep3Buffer[80], UEP3_T_LEN, UEP3_CTRL;
/* PRODUCTION_HID */
int main(void) {
    uint8_t payload[16], saved[80];
    for (unsigned i = 0; i < sizeof(payload); ++i) payload[i] = i + 20;
    assert(!HIDReady() && !HIDSend(2, payload, 4)); UsbConfig = 1; assert(HIDReady());
    const uint8_t sizes[] = {0,8,4,1,12};
    for (uint8_t id = 1; id <= 4; ++id) {
        memset(Ep3Buffer, 0xa5, sizeof(Ep3Buffer)); UpPoint3_Busy = 0;
        assert(HIDSend(id, payload, sizes[id]));
        assert(UpPoint3_Busy && UEP3_T_LEN == sizes[id] + 1 && Ep3Buffer[64] == id);
        assert(!memcmp(Ep3Buffer + 65, payload, sizes[id]));
        for (unsigned i = 0; i < 64; ++i) assert(Ep3Buffer[i] == 0xa5);
        for (unsigned i = 65 + sizes[id]; i < 80; ++i) assert(Ep3Buffer[i] == 0xa5);
        memcpy(saved, Ep3Buffer, 80); assert(!HIDSend(id, payload, sizes[id]) && !memcmp(saved, Ep3Buffer, 80));
    }
    UpPoint3_Busy = 0; UsbSuspended = 1; assert(!HIDReady() && !HIDSend(1, payload, 8));
    UsbSuspended = 0; HidProtocol = 0; assert(!HIDReady() && !HIDSend(4, payload, 12));
    assert(HIDSend(1, payload, 8) && UEP3_T_LEN == 8 && !memcmp(Ep3Buffer + 64, payload, 8));
    UpPoint3_Busy = 0; HidProtocol = 1; assert(!HIDSend(4, payload, 16));
    puts("PASS real HID transport report IDs/lengths, DMA bounds, busy/suspend guards and 8-byte boot keyboard");
}
