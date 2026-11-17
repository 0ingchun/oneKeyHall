#include "HallEngine.h"

__xdata HallSettings hallSettings;
__xdata HallState hall;

uint8_t hall_span(void) {
    return hallSettings.bottom > hallSettings.rest ? hallSettings.bottom - hallSettings.rest : hallSettings.rest - hallSettings.bottom;
}
uint8_t hall_valid(void) {
    return hallSettings.calibrated == 1 && hall_span() >= 16 &&
        hallSettings.rest > 1 && hallSettings.rest < 254 && hallSettings.bottom > 1 && hallSettings.bottom < 254;
}
void hall_reset(void) {
    hall.pressed = hall.armed = hall.cycle = hall.count = hall.initialized = 0;
    hall.position = hall.fault = 0;
}
void hall_sample(uint8_t raw) {
    __xdata int16_t travel;
    __xdata uint16_t delta;
    __xdata uint8_t desired, minimum;
    hall.raw = raw;
    if (!hall.initialized) { hall.accumulator = (uint16_t)raw << 4; hall.initialized = 1; }
    /* Fixed point avoids the stuck-at-one-count error of an integer EMA. */
    // Unsigned shifts preserve signed division's truncation toward zero.
    // ADC values and accumulator are bounded to 0..4080.
    delta = (uint16_t)raw << 4;
    if (delta >= hall.accumulator) hall.accumulator += (delta - hall.accumulator) >> hallSettings.filter;
    else hall.accumulator -= (hall.accumulator - delta) >> hallSettings.filter;
    hall.filtered = (hall.accumulator + 8) >> 4;
    hall.fault = raw <= 1 || raw >= 254;
    if (!hall_valid() || hall.fault) {
        hall.pressed = hall.armed = hall.cycle = hall.count = hall.position = 0;
        return;
    }
    travel = (int16_t)hall.filtered - hallSettings.rest;
    if (hallSettings.bottom < hallSettings.rest) travel = -travel;
    hall.position = travel <= 0 ? 0 : travel >= hall_span() ? 100 : (uint16_t)travel * 100 / hall_span();
    /* At startup/settings change/fault recovery, require an actual release first. */
    if (!hall.armed) {
        if (hall.position <= hallSettings.top) {
            if (++hall.count >= hallSettings.debounce) { hall.armed = 1; hall.count = 0; }
        } else hall.count = 0;
        return;
    }
    desired = hall.pressed;
    if (!hallSettings.rapid) {
        if (hall.position >= hallSettings.actuation) desired = 1;
        if (hall.position <= hallSettings.release) desired = 0;
    } else if (hall.position <= hallSettings.top) {
        desired = 0;
        hall.cycle = 0;
    } else if (!hall.cycle) {
        if (hall.position >= hallSettings.actuation) desired = 1;
    } else {
        /* At least two ADC counts; sub-count settings cannot create precision. */
        minimum = (200 + (uint16_t)hall_span() - 1) / hall_span();
        delta = hall.pressed ? hallSettings.rapidRelease : hallSettings.retrigger;
        if (delta < minimum) delta = minimum;
        if (hall.pressed) {
            if (hall.position > hall.extreme) hall.extreme = hall.position;
            if ((uint16_t)hall.position + delta <= hall.extreme) desired = 0;
        } else {
            if (hall.position < hall.extreme) hall.extreme = hall.position;
            if ((uint16_t)hall.extreme + delta <= hall.position) desired = 1;
        }
    }
    if (desired == hall.pressed) hall.count = 0;
    else {
        if (desired != hall.candidate) { hall.candidate = desired; hall.count = 0; }
        if (++hall.count >= hallSettings.debounce) {
            hall.pressed = desired; hall.count = 0; hall.extreme = hall.position;
            if (desired) hall.cycle = 1;
        }
    }
}
