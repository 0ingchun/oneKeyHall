#ifndef USER_USB_RAM
#error "This example needs to be compiled with a USER USB setting"
#endif
#if USER_USB_RAM < 240
#error "CDC + HID requires USER CODE w/ 266B USB RAM (endpoint 3 reaches byte 239)"
#endif

#include "src/userUsbHidKeyboard/USBCDC.h"
#include "src/userUsbHidKeyboard/USBHIDKeyboard.h"
#include "src/userUsbHidKeyboard/WS2812.h"

#include "src/HallEngine.h"
#include "src/LinearEngine.h"
#include "src/HallHardware.h"
#include "src/ChipInfo.h"
#include "src/FirmwareVersion.h"

#define VERSION 0x06       // EEPROM/config format, NOT application release version.
#define PRODUCT_TYPE 0x00  // 产品类型 范围0x00-0xFF

#define RGB_PIN 14
#define BUTTON_PIN 15

#define NUM_LEDS 1
#define COLOR_PER_LEDS 3
#define NUM_BYTES (NUM_LEDS * COLOR_PER_LEDS)

// 串口接收状态
enum State {
    IDLE,
    WAITING_OPEN_BRACKET,
    READING_KEY,
    WAITING_COLON,
    READING_VALUE,
    WAITING_CLOSE_BRACKET
};

typedef struct HSV {
    uint8_t h;
    uint8_t s;
    uint8_t v;
} CHSV;

typedef struct RGB {
    uint8_t r;
    uint8_t g;
    uint8_t b;
} CRGB;

// 按下次数
__xdata uint16_t clickCount = 0;

__xdata uint8_t ledData[NUM_BYTES];

// config 索引
enum {
    CONFIG_INDEX_VERSION = 0,                  // 版本号
    CONFIG_INDEX_PRODUCT_TYPE,                 // 产品类型
    CONFIG_INDEX_CLICK_COUNT_0,                // 按下次数
    CONFIG_INDEX_CLICK_COUNT_1,                // 按下次数
    CONFIG_INDEX_KEY_SELECT,                   // 按键选择 (对应值为 2 时开启双击功能, 双击使用 key2 的配置)
    CONFIG_INDEX_RGB_R = 10,                   // RGB 红
    CONFIG_INDEX_RGB_G,                        // RGB 绿
    CONFIG_INDEX_RGB_B,                        // RGB 蓝
    CONFIG_INDEX_RGB_BRIGHTNESS,               // RGB 亮度
    CONFIG_INDEX_RGB_MODE,                     // RGB 模式
    CONFIG_INDEX_RGB_INTERVAL,                 // RGB 间隔
    CONFIG_INDEX_RGB_STEP,                     // RGB 步长
    CONFIG_INDEX_KEY1_MODE = 17,               // KEY1 模式
    CONFIG_INDEX_KEY1_COMBINATION_START = 18,  // KEY1 组合键值开始
    CONFIG_INDEX_KEY1_COMBINATION_END = 22,    // KEY1 组合键值结束
    CONFIG_INDEX_KEY1_TEXT_START = 23,         // KEY1 输入文本开始
    CONFIG_INDEX_KEY1_TEXT_END = 52,           // KEY1 输入文本结束
    CONFIG_INDEX_KEY2_MODE = 53,               // KEY2 模式
    CONFIG_INDEX_KEY2_COMBINATION_START = 54,  // KEY2 组合键值开始
    CONFIG_INDEX_KEY2_COMBINATION_END = 58,    // KEY2 组合键值结束
    CONFIG_INDEX_KEY2_TEXT_START = 59,         // KEY2 输入文本开始
    CONFIG_INDEX_KEY2_TEXT_END = 88,           // KEY2 输入文本结束
    CONFIG_INDEX_HALL = 89,
    CONFIG_INDEX_LAST = 137, // Wire/RAM config; packed EEPROM uses 127 bytes plus CRC.
};

__xdata uint8_t config[CONFIG_INDEX_LAST];

// 函数声明
void handle_single_click();
void handle_double_click();
void handle_linear_click();
void handle_key_state(bool key_state, bool is_double_click);
void update_value(__xdata uint8_t* value, uint8_t min_value, uint8_t max_value, uint8_t step, __xdata bool* increasing);
void handle_color_effect();
void update_color_by_rgb(const __xdata CRGB* rgb, uint8_t brightness);
void update_color_by_hsv(const __xdata CHSV* hsv, uint8_t brightness);
void eeprom_write(uint8_t addr, uint8_t value);
void config2eeprom();
uint8_t config_crc(uint8_t length);
uint8_t storage_byte(uint8_t index);
void eeprom2config();
void handle_serial_input();
void handle_serial_input_kv(uint16_t key, uint16_t value);
void hsv2rgb(const __xdata CHSV* hsv, __xdata CRGB* rgb);
void reset_default_config();

// Runtime settings session: writes/calibration are muted and can be rolled back.
__xdata uint8_t backupConfig[CONFIG_INDEX_LAST];
__xdata uint8_t settingsOpen = 0, capture = 0, restCaptured = 0, captureRest;
__xdata uint8_t captureCount, captureMin, captureMax;
__xdata uint16_t captureSum;
__xdata unsigned long sessionTime = 0, sampleTime = 0;
__xdata uint8_t previousButton = 0, doubleState = 0;
__xdata uint16_t doubleTime;
__xdata uint8_t bootPending = 0;
__xdata unsigned long bootRequestTime;

// Bounded 16-bit decimal output; no generic 32-bit Print formatting needed.
void print_text(const __code char *s) { while (*s) USBSerial_print_c(*s++); }
void print_number(uint16_t value) {
    __xdata char digits[5]; uint8_t n = 0;
    do { digits[n++] = '0' + value % 10; value /= 10; } while (value);
    while (n) USBSerial_print_c(digits[--n]);
}

void print_field(uint8_t value) { USBSerial_print_c(','); print_number(value); }

void reply(uint16_t command, uint8_t status);
void load_hall_settings();
void stop_keys();
uint8_t validate_config();
void sample_hall();
void hall_defaults();
void print_status();

void setup() {
    hall_hardware_init();
    chip_read_info();
    eeprom2config();
    if (config[0] == 1) {
        // Preserve the original 89-byte key/RGB configuration on upgrade.
        config[0] = VERSION;
        hall_defaults();
        if (config[4] == 2) config[4] = 0; // RT-friendly direct action by default.
    } else if (config[0] != VERSION) reset_default_config();
    load_hall_settings();
    if (!validate_config()) { reset_default_config(); load_hall_settings(); }
    USBPrepareName(config + 100, config[6]); // Immutable snapshot until next power cycle.
    USBInit(); linear_reset();
    clickCount = ((uint16_t)config[2] << 8) | config[3];
    set_pixel_for_GRB_LED(ledData, 0, 0, 0, 0);
    neopixel_show_P1_4(ledData, NUM_BYTES);
    // No digitalRead wait: a Hall output need not reach a digital HIGH.
}

void load_hall_settings() {
    for (uint8_t i = 0; i < sizeof(HallSettings); ++i)
        ((__xdata uint8_t *)&hallSettings)[i] = config[CONFIG_INDEX_HALL + i];
    if (hallSettings.filter > 3) hallSettings.filter = 2;
    if (!hallSettings.debounce || hallSettings.debounce > 10) hallSettings.debounce = 2;
    hall_reset();
}

void stop_keys() {
    linear_reset();
    Keyboard_releaseAll();
    previousButton = doubleState = 0;
    hall_reset();
}

uint8_t validate_config() {
    if (!linear_valid()) return 0;
    if (config[5] < 5 || config[5] > 100 || config[6] > 12) return 0;
    for (uint8_t i = 0; i < config[6] * 2; i += 2) {
        uint8_t lo = config[100 + i], hi = config[101 + i];
        if ((hi >= 0xd8 && hi <= 0xdf) || (!hi && (lo < 32 || (lo >= 127 && lo < 160)))) return 0;
    }
    if (config[4] > 3 || config[17] > 3 || config[53] > 3 || config[14] > 6) return 0;
    if (config[89] > 1 || config[92] < 5 || config[92] > 95 || config[93] >= config[92] ||
        config[99] < 1 || config[99] > 10 || config[93] < config[99] ||
        config[94] > 1 || config[95] < 1 || config[95] > 50 || config[96] < 1 || config[96] > 50 ||
        config[97] > 3 || config[98] < 1 || config[98] > 10) return 0;
    if (config[94] && config[4] == 2) return 0; // Double-click delay conflicts with RT.
    if (config[89] && !hall_valid()) return 0;
    return 1;
}

void loop() {
    if (bootPending) {
        linear_task((uint16_t)millis(), 0);
        if (millis() - bootRequestTime >= 300UL) USBEnterBootloader();
        return;
    }
    static uint8_t seenEpoch;
    if (seenEpoch != HidEpoch) { seenEpoch = HidEpoch; stop_keys(); }
    handle_serial_input();
    if (bootPending) return;
    if (settingsOpen && (!USBSerial() || millis() - sessionTime > 60000UL)) {
        for (uint8_t i = 0; i < CONFIG_INDEX_LAST; ++i) config[i] = backupConfig[i];
        settingsOpen = capture = restCaptured = 0;
        load_hall_settings(); stop_keys();
    }
    if (millis() - sampleTime >= 1) {
        sampleTime = millis();
        sample_hall();
        if (!settingsOpen) {
            if (config[4] == 2) handle_double_click();
            else if (config[4] == 3) handle_linear_click();
            else handle_single_click();
        }
    }
    linear_task((uint16_t)millis(), config[4] == 3 && !settingsOpen);
    handle_color_effect();
    // Do not periodically wear Data Flash; clickCount is stored on explicit Save.
}

void sample_hall() {
    hall_sample(hall_read_adc());
    if (!capture) return;
    captureSum += hall.raw;
    if (hall.raw < captureMin) captureMin = hall.raw;
    if (hall.raw > captureMax) captureMax = hall.raw;
    if (++captureCount < 32) return;
    captureCount = (captureSum + 16) / 32;
    if (captureMax - captureMin > 4 || captureMin <= 1 || captureMax >= 254) {
        reply(capture, 3); // unstable or clipped
    } else if (capture == 11) {
        captureRest = captureCount; restCaptured = 1; reply(11, 0);
    } else if ((captureCount > captureRest ? captureCount - captureRest : captureRest - captureCount) < 16) {
        reply(12, 4); // insufficient ADC span
    } else {
        config[89] = 1; config[90] = captureRest; config[91] = captureCount;
        load_hall_settings(); restCaptured = 0; reply(12, 0);
    }
    capture = 0;
}

void handle_single_click() {
    if (hall.pressed == previousButton) return;
    previousButton = hall.pressed;
    handle_key_state(hall.pressed, config[4] == 1);
}

void handle_linear_click() {
    if (!hall.armed) { previousButton = doubleState = 0; return; }
    if (doubleState && (uint16_t)((uint16_t)millis() - doubleTime) >= (uint16_t)config[5] * 10) doubleState = 0;
    if (hall.pressed == previousButton) return;
    previousButton = hall.pressed;
    if (!hall.pressed) { ++clickCount; return; }
    if (!(config[124] & 128)) return;
    if (doubleState) { linearReverse ^= 1; doubleState = 0; }
    else { doubleState = 1; doubleTime = millis(); }
}

void handle_double_click() {
    // Window measured between press edges; exact deadline starts a new click.
    if (!hall.armed) { if (previousButton || doubleState) stop_keys(); return; }
    if (doubleState == 1 && (uint16_t)((uint16_t)millis() - doubleTime) >= (uint16_t)config[5] * 10) {
        handle_key_state(true, false);
        if (previousButton) doubleState = 2;
        else { handle_key_state(false, false); doubleState = 0; }
    }
    if (hall.pressed != previousButton) {
        previousButton = hall.pressed;
        if (hall.pressed) {
            if (doubleState == 1) { doubleState = 3; handle_key_state(true, true); }
            else { doubleState = 1; doubleTime = millis(); }
        } else if (doubleState >= 2) {
            handle_key_state(false, doubleState == 3); doubleState = 0;
        }
    }
}

void handle_key_state(bool key_state, bool is_double_click) {
    uint8_t base = is_double_click ? 53 : 17;
    uint8_t mode = config[base];
    if (!key_state) { ++clickCount; Keyboard_releaseAll(); return; }
    if (mode == 0) Keyboard_press(config[base + 1]);
    else if (mode == 1 || mode == 2) {
        for (uint8_t i = base + 1; i <= base + 5; ++i) {
            if (!config[i] || config[i] == 255) break;
            Keyboard_press(config[i]);
        }
        if (mode == 1) Keyboard_releaseAll();
    } else if (mode == 3) {
        for (uint8_t i = base + 6; i <= base + 35; ++i) {
            if (!config[i] || config[i] == 255) break;
            Keyboard_write(config[i]);
        }
    }
}

void update_value(__xdata uint8_t* value, uint8_t min_value, uint8_t max_value, uint8_t step, __xdata bool* increasing) {
    int16_t _value = *value;
    if (*increasing) {
        _value += step;
        if (_value >= max_value) {
            _value = max_value;
            *increasing = false;
        }
    } else {
        _value -= step;
        if (_value <= min_value) {
            _value = min_value;
            *increasing = true;
        }
    }
    *value = _value;
}

void handle_color_effect() {
    static __xdata uint16_t lastBreathTime = 0;
    uint16_t now = millis();
    static __xdata bool increasing = true;                // 方向标志，true 表示递增，false 表示递减
    static __xdata uint8_t currentBrightness = 0;         // 仅在亮度呼吸效果中使用
    static __xdata CHSV currentHSVColor = {0, 255, 255};  // 仅在 hue 渐变效果中使用
    if (config[14] >= 3) {
        uint8_t mode = config[14], position = hall.position;
        uint8_t brightness = config[13];
        if ((uint16_t)(now - lastBreathTime) < 10) return;
        lastBreathTime = now;
        if (mode == 4) position = 100 - position;
        if (mode != 5) brightness = (uint16_t)brightness * position / 100;
        if (!hall_valid() || hall.fault) brightness = 0;
        if (mode >= 5) {
            uint8_t start = config[15], end = config[16];
            uint8_t delta = end >= start ? end - start : start - end;
            delta = (uint16_t)delta * position / 100U;
            currentHSVColor.h = end >= start ? start + delta : start - delta;
            currentHSVColor.v = 255;
            update_color_by_hsv(&currentHSVColor, brightness);
        } else {
            update_color_by_rgb((const __xdata CRGB *)(config + 10), brightness);
        }
        return;
    }
    if ((uint16_t)(now - lastBreathTime) > (config[CONFIG_INDEX_RGB_MODE] == 0 ? 1000 : config[CONFIG_INDEX_RGB_INTERVAL])) {
        lastBreathTime = now;
        switch (config[CONFIG_INDEX_RGB_MODE]) {
            case 0:
                update_color_by_rgb((const __xdata CRGB *)(config + 10), config[CONFIG_INDEX_RGB_BRIGHTNESS]);
                break;
            case 1:
                update_color_by_rgb((const __xdata CRGB *)(config + 10), currentBrightness);
                update_value(&currentBrightness, 0, config[CONFIG_INDEX_RGB_BRIGHTNESS], config[CONFIG_INDEX_RGB_STEP], &increasing);
                break;
            case 2:
                currentHSVColor.v = config[CONFIG_INDEX_RGB_BRIGHTNESS];  // hsv，用 v 限制亮度
                update_color_by_hsv(&currentHSVColor, 255);
                update_value(&currentHSVColor.h, 0, 255, config[CONFIG_INDEX_RGB_STEP], &increasing);
                break;
        }
    }
}

void update_color_by_rgb(const __xdata CRGB* rgb, uint8_t brightness) {
    static __xdata CRGB lastRgb = {0, 0, 0};
    static __xdata uint8_t lastBrightness = 0;
    if (rgb->r == lastRgb.r && rgb->g == lastRgb.g && rgb->b == lastRgb.b && brightness == lastBrightness) return;
    lastRgb.r = rgb->r; lastRgb.g = rgb->g; lastRgb.b = rgb->b;
    lastBrightness = brightness;
    set_pixel_for_GRB_LED(ledData, 0, (uint16_t)rgb->r * brightness / 255U, (uint16_t)rgb->g * brightness / 255U, (uint16_t)rgb->b * brightness / 255U);
    neopixel_show_P1_4(ledData, NUM_BYTES);
}

void update_color_by_hsv(const __xdata CHSV* hsv, uint8_t brightness) {
    __xdata CRGB rgb = {0, 0, 0};
    hsv2rgb(hsv, &rgb);
    update_color_by_rgb(&rgb, brightness);
}

void eeprom_write(uint8_t addr, uint8_t value) {
    if (eeprom_read_byte(addr) == value) return;
    eeprom_write_byte(addr, value);

    // print_text("EEPROM w");
    // USBSerial_println(addr);
    // USBSerial_flush();
}

static const __code uint8_t storageMap[127] = {0,2,3,4,5,6,10,11,12,13,15,16,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,95,96,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136};
uint8_t storage_byte(uint8_t index) {
    if (index == 3) return config[4] | (config[17] << 2) | (config[53] << 4) | ((config[14] & 3) << 6);
    if (index == 5) return config[6] | ((config[14] >> 2) << 4);
    if (index == 82) return config[89] | (config[94] << 1) | (config[97] << 2) | ((config[98] - 1) << 4);
    return config[storageMap[index]];
}
void config2eeprom() {
    config[2] = clickCount >> 8; config[3] = clickCount;
    eeprom_write(0, 255);
    for (uint8_t i = 1; i < 127; i++) eeprom_write(i, storage_byte(i));
    eeprom_write(127, config_crc(127));
    eeprom_write(0, VERSION);
}
uint8_t config_crc(uint8_t length) {
    uint8_t crc = 0;
    for (uint8_t i = 0; i < length; ++i) {
        crc ^= length == 127 ? storage_byte(i) : config[i];
        for (uint8_t bit = 0; bit < 8; ++bit) crc = (crc & 128) ? (crc << 1) ^ 7 : crc << 1;
    }
    return crc;
}
void eeprom2config() {
    uint8_t version, length;
    for (uint8_t i = 0; i < 128; ++i) config[i] = eeprom_read_byte(i);
    version = config[0];
    length = version == 2 ? 100 : version == 3 ? 124 : 128;
    if ((version >= 2 && version <= VERSION) && config_crc(length) != (length == 128 ? 0 : config[length])) {
        config[0] = 255; return;
    }
    if (version == 4 || version == 5 || version == VERSION) {
        for (uint8_t i = 0; i < 128; ++i) backupConfig[i] = config[i];
        for (uint8_t i = 0; i < CONFIG_INDEX_LAST; ++i) config[i] = 0;
        for (uint8_t i = 0; i < 127; ++i) config[storageMap[i]] = backupConfig[i];
        config[4] = backupConfig[3] & 3; config[17] = (backupConfig[3] >> 2) & 3;
        config[53] = (backupConfig[3] >> 4) & 3; config[14] = (backupConfig[3] >> 6) | ((backupConfig[5] >> 4) << 2);
        config[6] = backupConfig[5] & 15; config[0] = VERSION;
        config[89] = backupConfig[82] & 1; config[94] = (backupConfig[82] >> 1) & 1;
        config[97] = (backupConfig[82] >> 2) & 3; config[98] = (backupConfig[82] >> 4) + 1;
    } else {
        if (version == 1 || version == 2) {
            config[5] = 20; config[6] = 0;
            for (uint8_t i = 100; i < 124; ++i) config[i] = 0;
        }
        linear_defaults();
        if (version == 2 || version == 3) {
            config[0] = VERSION;
            if (config[4] == 3) config[4] = 0; // Old host-only mode must not auto-start native outputs.
        }
    }
}

// Strict bounded parser for {key:value}; fragmented USB packets are supported.
void handle_serial_input() {
    static __xdata uint8_t state = 0, digits = 0;
    static __xdata uint16_t key, value;
    uint8_t budget = 64;
    while (USBSerial_available() && budget--) {
        if (bootPending) break;
        char c = USBSerial_read();
        if (c == '{') { state = 1; digits = 0; key = value = 0; continue; }
        if (c >= '0' && c <= '9' && (state == 1 || state == 2)) {
            if (++digits > 3) { state = 0; continue; }
            if (state == 1) key = key * 10 + c - '0';
            else value = value * 10 + c - '0';
        } else if (c == ':' && state == 1 && digits) { state = 2; digits = 0; }
        else if (c == '}' && state == 2 && digits) { state = 0; handle_serial_input_kv(key, value); }
        else state = 0;
    }
}

void reply(uint16_t command, uint8_t status) {
    print_text("[1000,"); print_number(command); USBSerial_print_c(',');
    print_number(status); print_text("]\n"); USBSerial_flush();
}

void print_status() {
    print_text("[1001");
    print_field(hall.raw); print_field(hall.filtered); print_field(hall.position);
    print_field(hall.pressed && !settingsOpen); print_field(hall_valid()); print_field(hall.armed);
    print_field(settingsOpen); print_field(hall_span()); print_field(hall.fault);
    print_field(hall.extreme); print_field(hall.cycle); print_field(linearReverse);
    print_text("]\n"); USBSerial_flush();
}

void handle_serial_input_kv(uint16_t key, uint16_t value) {
    if (bootPending) return;
    if (key < CONFIG_INDEX_LAST && value <= 255) {
        if (!settingsOpen || capture || key < 4 || (key >= 89 && key <= 91)) { reply(key, 1); return; }
        config[key] = value; sessionTime = millis(); reply(key, 0); return;
    }
    if (key != 999) return;
    if (settingsOpen) sessionTime = millis();
    switch (value) {
        case 0: // Explicit persistent save, only inside a settings session.
        case 13: // Apply RAM settings and resume; do not write flash.
        case 15: // Explicit factory reset; clear all settings and persist defaults.
            if (capture || (value != 15 && !settingsOpen)) { reply(value, 1); break; }
            if (value == 15) {
                reset_default_config(); clickCount = 0;
                settingsOpen = restCaptured = 0; // No stale backup on save failure.
            }
            load_hall_settings(); stop_keys();
            if (!validate_config()) { reply(value, 2); break; }
            if (value != 13) {
                config2eeprom();
                for (uint8_t i = 0; i < 127; ++i)
                    if (eeprom_read_byte(i) != storage_byte(i)) { reply(value, 5); return; }
                if (eeprom_read_byte(127) != config_crc(127)) { reply(value, 5); return; }
            }
            settingsOpen = restCaptured = 0; reply(value, 0); break;
        case 1:
            for (uint8_t i = 0; i < CONFIG_INDEX_LAST; ++i) {
                USBSerial_print_c(i == 0 ? '[' : ',');
                if (i == 2) print_number(clickCount >> 8);
                else if (i == 3) print_number(clickCount & 255);
                else print_number(config[i]);
            }
            print_text("]\n"); USBSerial_flush(); break;
        case 2:
            if (config[14] == 0) {
                update_color_by_rgb((const __xdata CRGB *)(config + 10), config[13]);
            }
            reply(2, 0); break;
        case 3: print_status(); break;
        case 4:
            print_text("[1002,255]\n"); USBSerial_flush(); break; // ISP + RT + linear + settings + native HID + identity + travel LED
        case 5: // Read-only application release; final field declares manual ISP support.
            print_text(ONEKEYHALL_FW_FRAME "1]\n");
            USBSerial_flush(); break;
        case 6: // Read-only ROM identity, independent of application version.
            print_text("[1004");
            for (uint8_t i = 0; i < 7; ++i) print_field(chipInfo[i]);
            print_text("]\n"); USBSerial_flush(); break;
        case 16: stop_keys(); reply(16, 0); break; // Resynchronize approximate volume at next release.
        case 99:
            stop_keys();
            settingsOpen = capture = restCaptured = 0;
            bootPending = 1;
            // Send black to the latched RGB LED before the ACK/grace period.
            // The bootPending loop prevents animation from lighting it again.
            set_pixel_for_GRB_LED(ledData, 0, 0, 0, 0);
            neopixel_show_P1_4(ledData, NUM_BYTES);
            reply(99, 0);
            bootRequestTime = millis();
            break;
        case 10:
            if (!settingsOpen) {
                for (uint8_t i = 0; i < CONFIG_INDEX_LAST; ++i) backupConfig[i] = config[i];
                settingsOpen = 1; restCaptured = capture = 0; stop_keys();
            }
            sessionTime = millis(); reply(10, 0); break;
        case 11:
        case 12:
            if (!settingsOpen || capture || (value == 12 && !restCaptured)) { reply(value, 1); break; }
            capture = value; captureCount = captureMax = captureSum = 0; captureMin = 255; break;
        case 14:
            if (settingsOpen) {
                for (uint8_t i = 0; i < CONFIG_INDEX_LAST; ++i) config[i] = backupConfig[i];
            }
            settingsOpen = capture = restCaptured = 0; load_hall_settings(); stop_keys(); reply(14, 0); break;
        default: reply(value, 1); break;
    }
}

void hall_defaults() {
    config[89] = config[90] = config[91] = 0;
    config[92] = 50; config[93] = 40; config[94] = 0;
    config[95] = config[96] = 5; config[97] = 2; config[98] = 2; config[99] = 3;
}

void hsv2rgb(const __xdata CHSV* hsv, __xdata CRGB* rgb) {
    // The only caller is the fully saturated HUE animation. Retain its exact integer colors.
    uint8_t region = hsv->h / 43U, remainder = (hsv->h - region * 43) * 6;
    uint8_t v = hsv->v, p = 0;
    uint8_t q = ((uint16_t)v * (remainder ? 256 - remainder : 255)) >> 8;
    uint8_t t = ((uint16_t)v * (remainder + 1)) >> 8;

    switch (region) {
        case 0:
            rgb->r = v;
            rgb->g = t;
            rgb->b = p;
            break;
        case 1:
            rgb->r = q;
            rgb->g = v;
            rgb->b = p;
            break;
        case 2:
            rgb->r = p;
            rgb->g = v;
            rgb->b = t;
            break;
        case 3:
            rgb->r = p;
            rgb->g = q;
            rgb->b = v;
            break;
        case 4:
            rgb->r = t;
            rgb->g = p;
            rgb->b = v;
            break;
        default:
            rgb->r = v;
            rgb->g = p;
            rgb->b = q;
            break;
    }
}

void reset_default_config() {
    for (uint8_t i = 0; i < CONFIG_INDEX_LAST; ++i) config[i] = 0;
    hall_defaults();
    linear_defaults();
    // 版本号
    config[CONFIG_INDEX_VERSION] = VERSION;
    // Product type, count, KEY1 mode and key selection are already zeroed above.
    config[5] = 20; // 200 ms default; units of 10 ms.
    // RGB
    config[CONFIG_INDEX_RGB_R] = config[CONFIG_INDEX_RGB_G] = config[CONFIG_INDEX_RGB_B] = config[CONFIG_INDEX_RGB_BRIGHTNESS] = 255;
    config[CONFIG_INDEX_RGB_MODE] = 2;
    config[CONFIG_INDEX_RGB_INTERVAL] = 30;
    config[CONFIG_INDEX_RGB_STEP] = 1;
    // 按键
    config[CONFIG_INDEX_KEY2_MODE] = 2;
    config[CONFIG_INDEX_KEY2_COMBINATION_START] = KEY_LEFT_ALT;
    config[CONFIG_INDEX_KEY2_COMBINATION_START + 1] = KEY_TAB;
    for (uint8_t i = 0; i < 10; ++i) {
        config[CONFIG_INDEX_KEY1_TEXT_START + i] = config[CONFIG_INDEX_KEY2_TEXT_START + i] = "oneKeyHall"[i];
    }
    config[CONFIG_INDEX_KEY1_COMBINATION_START] = ' ';
}
