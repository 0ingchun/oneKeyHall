#ifndef HALL_ENGINE_H
#define HALL_ENGINE_H
#include <stdint.h>
#ifndef __SDCC
#define __code
#define __xdata
#endif

/* Byte-for-byte config[89..99]. Percent means normalized ADC travel, not mm. */
typedef struct {
    uint8_t calibrated, rest, bottom, actuation, release;
    uint8_t rapid, retrigger, rapidRelease, filter, debounce, top;
} HallSettings;
typedef struct {
    uint16_t accumulator;
    uint8_t raw, filtered, position, pressed, armed, cycle, extreme;
    uint8_t candidate, count, initialized, fault;
} HallState;
extern __xdata HallSettings hallSettings;
extern __xdata HallState hall;
uint8_t hall_span(void);
uint8_t hall_valid(void);
void hall_reset(void);
void hall_sample(uint8_t raw);
#endif
