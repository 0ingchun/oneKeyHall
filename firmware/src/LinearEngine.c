#include "LinearEngine.h"
#ifdef __SDCC
#include "userUsbHidKeyboard/USBhandler.h"
#else
uint8_t HIDReady(void);
uint8_t HIDSend(uint8_t id, const uint8_t *data, uint8_t length);
#endif
extern __xdata uint8_t config[];
__xdata uint8_t linearReverse;
static __xdata uint8_t report[12], held, releasing, mouseDown, volumeReady, volumeEstimate, syncLeft;
static __xdata uint16_t lastTick, wheelCredit;

void linear_defaults(void) {
    config[124] = 4; // Cursor click is inert until a deliberate calibrated press.
    config[125] = 30; config[126] = 0; config[127] = 100; config[128] = 50;
    config[129] = config[131] = 0; config[130] = config[132] = 64; // center 16384
    config[133] = 1; config[134] = 25; config[135] = 1; config[136] = 255;
}
uint8_t linear_valid(void) {
    return (config[124] & 0x78) == 0 && config[124] != 132 && config[125] >= 1 && config[125] <= 100 &&
        config[126] <= config[127] && config[127] <= 100 && config[128] >= 1 && config[128] <= 100 &&
        config[130] < 128 && config[132] < 128 && config[133] >= 1 && config[133] <= config[134] &&
        config[134] <= 250 && config[135] <= config[136];
}
void linear_reset(void) { linearReverse = 0; releasing = held; volumeReady = 0; syncLeft = 100; wheelCredit = 0; }
static uint8_t mix(uint8_t lo, uint8_t hi, uint8_t position) {
    return lo + (uint16_t)(hi - lo) * position / 100;
}
static uint16_t root(uint16_t n) {
    uint16_t result = 0, bit = 0x4000;
    while (bit) {
        if (n >= result + bit) { n -= result + bit; result = (result >> 1) + bit; }
        else result >>= 1;
        bit >>= 2;
    }
    return result;
}
void linear_task(uint16_t now, uint8_t enabled) {
    uint8_t preset, p, target, value, id, length;
    uint16_t width;
    if (!HIDReady()) { linear_reset(); return; }
    if ((uint16_t)(now - lastTick) < 10) return;
    enabled = enabled && hall.armed && !hall.fault && hall_valid();
    if (!enabled) linear_reset();
    if (releasing) {
        id = releasing; length = id == 4 ? 12 : id == 2 ? 4 : 1;
        report[0] = 0;
        if (id == 4) report[11] = 1; // One final lifted contact, same ID and coordinates.
        if (!HIDSend(id, report, length)) return;
        held = releasing = mouseDown = 0; lastTick = now; return;
    }
    if (!enabled) return;
    preset = config[124] & 7;
    if (linearReverse && preset < 4) preset ^= 1;
    p = hall.position > config[99] ? (uint16_t)(hall.position - config[99]) * 100 / (100 - config[99]) : 0;
    if (preset < 2) {
        if (held == 3) {
            report[0] = 0;
            if (!HIDSend(3, report, 1)) return;
            held = 0;
        } else {
            if (!volumeReady) { target = 0; value = 2; }
            else {
                target = (uint16_t)mix(config[126], config[127], preset == 1 ? 100 - p : p) * config[128] / 100;
                if (target == volumeEstimate) return;
                value = target > volumeEstimate ? 1 : 2;
            }
            report[0] = value;
            if (!HIDSend(3, report, 1)) return;
            held = 3;
            if (!volumeReady) { if (!--syncLeft) { volumeReady = 1; volumeEstimate = 0; } }
            else if (value == 1) volumeEstimate++; else volumeEstimate--;
        }
    } else if (preset <= 4) {
        report[0] = preset == 4 && hall.pressed;
        report[1] = report[2] = report[3] = 0;
        if (preset == 4) { if (report[0] == mouseDown) return; }
        else {
            if (!p) { wheelCredit = 0; return; }
            // Preserve fractional detents even at very low travel/speed.
            wheelCredit += (uint16_t)p * config[125];
            if (wheelCredit < 10000) { lastTick = now; return; }
            report[3] = preset == 2 ? 1 : 255;
        }
        if (!HIDSend(2, report, 4)) { if (wheelCredit > 10000) wheelCredit = 10000; lastTick = now; return; }
        if (preset != 4) wheelCredit -= 10000;
        mouseDown = report[0]; held = mouseDown ? 2 : 0;
    } else {
        if (!p || (!held && hall.position <= config[99] + 1)) {
            if (held) releasing = held;
            return;
        }
        report[0] = 1; report[1] = 0; // Tip, stable contact ID.
        for (uint8_t i = 0; i < 4; i++) report[2 + i] = config[129 + i];
        if (linearReverse) p = 100 - p;
        value = preset == 6 ? config[133] : mix(config[133], config[134], p);
        // Square root makes AREA linear. Coordinate scale is 32767 per display axis.
        width = root((uint16_t)value * 100);
        width = width * 32 + width * 49 / 64;
        report[6] = report[8] = width; report[7] = report[9] = width >> 8;
        report[10] = preset == 5 ? config[136] : mix(config[135], config[136], p);
        report[11] = 1;
        if (!HIDSend(4, report, 12)) return;
        held = 4;
    }
    lastTick = now;
}
