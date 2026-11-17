/* Host-only doubles for USB, GPIO and Data Flash. Production control code is
 * inserted between this prelude and firmware_cases.c by run_tests.py. */
#include <assert.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <limits.h>
#include "HallEngine.h"
#include "LinearEngine.h"
#include "ChipInfo.h"
uint8_t chipRom[0x4000];
#include "FirmwareVersion.h"
#define USER_USB_RAM 266
#define INPUT 0
#define OUTPUT 1
#define KEY_LEFT_ALT 130
#define KEY_TAB 179
static uint8_t adc, connected = 1, flash[128], flashFail;
static unsigned long now;
static unsigned presses, releases, writes;
static unsigned bootEntries;
static uint8_t HidEpoch, hidReady = 1, hidAccept = 1;
static unsigned hidPackets;
static struct { uint8_t id, length, bytes[12]; } hidLog[2048];
uint8_t HIDReady(void) { return hidReady; }
uint8_t HIDSend(uint8_t id, const uint8_t *data, uint8_t length) {
    assert(id >= 2 && id <= 4 && length <= 12);
    if (!hidReady || !hidAccept) return 0;
    assert(hidPackets < 2048); hidLog[hidPackets].id = id; hidLog[hidPackets].length = length;
    memcpy(hidLog[hidPackets++].bytes, data, length); return 1;
}
static unsigned ledShows;
static uint8_t shownLed[3];
static uint8_t lastKey, pin15mode = 255;
static char rx[2048], tx[8192];
static size_t rxpos, txpos;
void USBInit(void) {}
static uint8_t usbName[24], usbNameLength;
void USBPrepareName(uint8_t *name, uint8_t length) { assert(length <= 12); usbNameLength = length; memcpy(usbName, name, length * 2); }
void USBEnterBootloader(void) { assert(!shownLed[0] && !shownLed[1] && !shownLed[2]); ++bootEntries; }
void pinMode(uint8_t pin, uint8_t mode) { if (pin == 15) pin15mode = mode; }
uint8_t analogRead(uint8_t pin) { assert(pin == 15); return adc; }
unsigned long millis(void) { return now; }
uint8_t eeprom_read_byte(uint8_t address) { assert(address < 128); return flash[address]; }
void eeprom_write_byte(uint8_t address, uint8_t value) { assert(address < 128); if (!flashFail) flash[address] = value; ++writes; }
void set_pixel_for_GRB_LED(uint8_t *data, uint8_t n, uint8_t r, uint8_t g, uint8_t b) { data[n*3] = g; data[n*3+1] = r; data[n*3+2] = b; }
void neopixel_show_P1_4(uint8_t *data, uint8_t n) { assert(n == 3); memcpy(shownLed, data, 3); ++ledShows; }
void Keyboard_releaseAll(void) { ++releases; }
void Keyboard_press(uint8_t key) { ++presses; lastKey = key; }
void Keyboard_write(uint8_t key) { ++presses; lastKey = key; }
bool USBSerial(void) { return connected; }
uint8_t USBSerial_available(void) { return rx[rxpos] != 0; }
char USBSerial_read(void) { return rx[rxpos++]; }
void USBSerial_print_s(const char *s) { txpos += (size_t)snprintf(tx + txpos, sizeof(tx) - txpos, "%s", s); }
void USBSerial_print_c(char c) { assert(txpos + 1 < sizeof(tx)); tx[txpos++] = c; tx[txpos] = 0; }
void USBSerial_print(unsigned int value) { txpos += (size_t)snprintf(tx + txpos, sizeof(tx) - txpos, "%u", value); }
void USBSerial_flush(void) {}

#include "HallHardware.h"
