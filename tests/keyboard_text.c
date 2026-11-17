#include <stdint.h>
#include <string.h>
#include <stdio.h>
#include <assert.h>
#define __code
/* ASCII_MAP */
uint8_t HIDKey[8];
uint8_t reports[4][8];
unsigned packets;
uint8_t USB_EP3_send(void) { assert(packets < 4); memcpy(reports[packets++], HIDKey, 8); return 1; }
/* KEYBOARD_FUNCTIONS */
int main(void) {
    for (unsigned key = 0; key < 128; ++key) {
        if (!_asciimap[key]) continue;
        packets = 0; memset(HIDKey, 0, 8); assert(Keyboard_write(key) == 1);
        assert(packets == 2 && reports[0][2] == (_asciimap[key] & 127));
        assert(reports[0][0] == (_asciimap[key] & 128 ? 2 : 0));
        for (unsigned i = 0; i < 8; ++i) assert(!reports[1][i] && !HIDKey[i]);
    }
    packets = 0; Keyboard_press(130); Keyboard_press(179);
    assert(reports[1][0] == 4 && reports[1][2] == 43);
    Keyboard_releaseAll(); assert(packets == 3); for (unsigned i = 0; i < 8; ++i) assert(!reports[2][i]);
    puts("PASS production ASCII text key/modifier release for every mapped character; chord press/release retained");
}
