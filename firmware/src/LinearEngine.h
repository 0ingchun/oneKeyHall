#ifndef ONEKEYHALL_LINEAR_ENGINE_H
#define ONEKEYHALL_LINEAR_ENGINE_H
#include "HallEngine.h"
// config[124..136]: preset, wheel rate, min/max volume, volume steps,
// X/Y (LE 0..32767), min/max area (0.01% screen area), min/max pressure (0..255).
extern __xdata uint8_t linearReverse;
void linear_defaults(void);
uint8_t linear_valid(void);
void linear_reset(void);
void linear_task(uint16_t now, uint8_t enabled);
#endif
