static void command(uint16_t key, uint16_t value) { txpos = 0; tx[0] = 0; handle_serial_input_kv(key, value); }
static void ack(unsigned commandId, unsigned result) {
    char expected[40]; snprintf(expected, sizeof(expected), "[1000,%u,%u]\n", commandId, result);
    assert(strcmp(tx, expected) == 0);
}
static void input(const char *text) { strcpy(rx, text); rxpos = 0; handle_serial_input(); }
static void samples(uint8_t raw, unsigned count) { adc = raw; while (count--) { ++now; loop(); } }
static void defaults(void) {
    bootPending = 0;
    settingsOpen = capture = restCaptured = 0; connected = 1;
    hidReady = hidAccept = 1;
    reset_default_config(); load_hall_settings(); stop_keys();
    linear_task((uint16_t)(now + 10), 0); hidPackets = 0;
    presses = releases = clickCount = 0; rx[0] = 0; rxpos = 0;
}
static void calibrated(uint8_t rest, uint8_t bottom) {
    defaults(); config[89] = 1; config[90] = rest; config[91] = bottom; config[97] = 0;
    load_hall_settings();
}
/* NATIVE_LINEAR_CASES */
/* IDENTITY_LIGHT_CASES */
/* LINEAR_REVERSE_CASES */
/* FACTORY_RESET_CASES */
int main(void) {
    memset(flash, 255, sizeof(flash)); adc = 128; setup();
    assert(pin15mode == INPUT && !config[89]);
    assert(!memcmp(config + 23, "oneKeyHall", 11) && !memcmp(config + 59, "oneKeyHall", 11)); samples(210, 20); assert(!presses);
    puts("PASS fresh boot: high impedance, uncalibrated key disabled, no startup hang");

    defaults(); config[18] = 'z'; config[4] = 2;
    memcpy(flash, config, 89); flash[0] = 1; setup();
    assert(config[0] == 6 && config[18] == 'z' && !config[89] && config[4] == 0);
    puts("PASS v1 migration preserves mapping and requires calibration");

    calibrated(100, 200); config[0] = 2; config[4] = 1; config[18] = 'q'; config[13] = 77;
    config[5] = 255; config[6] = 255; // Previously reserved, not trusted by v3.
    memcpy(flash, config, 100); flash[100] = config_crc(100);
    setup(); assert(config[0] == 6 && config[5] == 20 && !config[6]);
    assert(config[4] == 1 && config[18] == 'q' && config[13] == 77 && config[90] == 100 && config[91] == 200);
    for (unsigned i = 100; i < 124; ++i) assert(!config[i]);
    flash[92] ^= 1; setup(); assert(!config[89]);
    puts("PASS v2 CRC migration preserves calibration/key/LED settings and rejects corruption");

    defaults(); command(999, 10); command(6, 2);
    command(100, 0xcf); command(101, 0x78); command(102, 0x74); command(103, 0x8f); // BMP UTF-16 name
    command(5, 35); command(999, 13); ack(13, 0);
    assert(config[5] == 35 && !usbNameLength); // Apply cannot mutate active USB descriptors.
    command(999, 10); command(999, 0); ack(0, 0); setup();
    assert(usbNameLength == 2 && usbName[0] == 0xcf && usbName[1] == 0x78 && config[5] == 35);
    command(999, 10); command(5, 4); command(999, 13); ack(13, 2); command(999, 14); assert(config[5] == 35);
    command(999, 10); command(6, 13); command(999, 13); ack(13, 2); command(999, 14);
    command(999, 10); command(101, 0xd8); command(999, 13); ack(13, 2); command(999, 14);
    command(999, 10); command(6, 0); command(999, 0); ack(0, 0); setup(); assert(!usbNameLength);
    puts("PASS name/timing apply, persistence, USB boot snapshot, rollback and validation");

    calibrated(100, 200); samples(170, 10); assert(!presses && !hall.armed);
    samples(100, 3); assert(hall.armed); samples(150, 1); assert(!presses);
    samples(150, 1); assert(presses == 1 && hall.pressed);
    samples(149, 8); assert(hall.pressed);
    samples(140, 2); assert(!hall.pressed && clickCount == 1);
    puts("PASS startup release guard, hysteresis, two-sample confirmation, click count");

    calibrated(210, 110); samples(210, 3); samples(150, 2); assert(hall.pressed);
    samples(170, 2); assert(!hall.pressed); samples(210, 3);
    config[4] = 1; config[53] = 0; config[54] = 'x'; samples(150, 2); assert(lastKey == 'x');
    puts("PASS reversed magnetic polarity and direct KEY2 mapping");

    calibrated(100, 200); config[94] = 1; load_hall_settings(); samples(100, 3);
    samples(160, 2); assert(hall.pressed); samples(180, 2); samples(176, 4); assert(hall.pressed);
    command(999, 3); assert(strcmp(tx, "[1001,176,176,76,1,1,1,0,100,0,80,1,0]\n") == 0);
    samples(175, 2); assert(!hall.pressed); samples(165, 2); samples(169, 2); assert(!hall.pressed);
    command(999, 3); assert(strcmp(tx, "[1001,169,169,69,0,1,1,0,100,0,65,1,0]\n") == 0);
    samples(170, 2); assert(hall.pressed); samples(100, 2); assert(!hall.pressed && !hall.cycle);
    samples(110, 4); assert(!hall.pressed); samples(150, 2); assert(hall.pressed);
    samples(255, 1); assert(!hall.pressed && !hall.armed && hall.fault);
    samples(150, 5); assert(!hall.pressed); samples(100, 3); assert(hall.armed);
    puts("PASS RT extremum tracking, retrigger, top reset and rail-fault release/rearm");

    calibrated(100, 120); config[94] = 1; config[95] = config[96] = 1; load_hall_settings();
    samples(100, 3); samples(115, 2); samples(114, 4); assert(hall.pressed);
    samples(113, 2); assert(!hall.pressed);
    puts("PASS RT two-ADC-count minimum with small calibration span");

    calibrated(100, 200); config[97] = 3; load_hall_settings(); samples(100, 3);
    samples(200, 100); assert(hall.pressed && hall.filtered >= 199);
    samples(100, 100); assert(!hall.pressed && hall.filtered <= 101);
    puts("PASS fixed-point filter converges in both directions");

    calibrated(100, 200); config[4] = 3; assert(validate_config());
    samples(100, 3); samples(200, 10); assert(hall.position == 100 && hall.pressed && !presses);
    samples(100, 10); assert(!presses && clickCount == 1 && hall.position == 0);
    config[4] = 4; assert(!validate_config()); config[4] = 3;
    command(999, 10); command(999, 0); ack(0, 0); assert((flash[3] & 3) == 3);
    setup(); assert(config[4] == 3); samples(100, 5); samples(200, 5); assert(!presses);
    puts("PASS linear mode persists and reports analog travel without keyboard output");


    defaults(); command(92, 60); ack(92, 1); assert(config[92] == 50);
    command(999, 10); ack(10, 0); assert(settingsOpen);
    command(90, 100); ack(90, 1);
    command(999, 12); ack(12, 1);
    command(999, 11); samples(100, 32); ack(11, 0); assert(restCaptured);
    command(999, 12); samples(110, 32); ack(12, 4); assert(!config[89]);
    command(999, 12); samples(180, 31); samples(190, 1); ack(12, 3); assert(!config[89]);
    command(999, 12); samples(200, 32); ack(12, 0);
    assert(config[89] && config[90] == 100 && config[91] == 200 && !presses);
    command(999, 13); ack(13, 0); assert(!settingsOpen);
    samples(200, 10); assert(!presses); samples(100, 30); samples(180, 30); assert(presses == 1);
    puts("PASS calibration ordering, noise/span rejection, muted calibration and explicit apply");

    command(999, 10); command(92, 30); command(999, 13); ack(13, 2); assert(settingsOpen);
    command(999, 14); ack(14, 0); assert(config[92] == 50 && !settingsOpen);
    command(999, 10); command(92, 65); connected = 0; ++now; loop();
    assert(!settingsOpen && config[92] == 50); connected = 1;
    command(999, 10); command(92, 65); now += 60001; loop(); assert(!settingsOpen && config[92] == 50);
    puts("PASS invalid parameter refusal, cancel, disconnect and idle timeout rollback");

    command(999, 10); input("{92:"); input("60}"); assert(config[92] == 60);
    input("{92:999999}"); assert(config[92] == 60);
    input("{92x:70}"); assert(config[92] == 60);
    input("{999999:1}{92:65}"); assert(config[92] == 65);
    command(999, 14);
    puts("PASS fragmented commands, malformed input and integer-overflow rejection");

    clickCount = 513; command(999, 10); command(999, 0); ack(0, 0);
    assert(flash[0] == 6 && flash[1] == 2 && flash[2] == 1 && flash[127] == config_crc(127));
    config[92] = 70; eeprom2config(); assert(config[92] == 50 && config[0] == 6);
    flash[92] ^= 1; eeprom2config(); assert(config[0] == 255); setup(); assert(!config[89]);
    defaults(); command(999, 10); flashFail = 1; command(999, 0); ack(0, 5); flashFail = 0;
    puts("PASS persistent save/readback, click counter, CRC corruption and failed-write reporting");

    calibrated(100, 200); config[4] = 2; config[17] = config[53] = 0; config[54] = 'x';
    samples(100, 3); samples(160, 2); samples(100, 2); assert(!presses);
    command(999, 10); samples(100, 250); assert(!presses); command(999, 14);
    samples(100, 3); samples(160, 2); samples(100, 2); samples(160, 2); assert(presses == 1 && lastKey == 'x');
    samples(100, 2); assert(doubleState == 0);
    puts("PASS double-click selection and pending-action cancellation during settings");

    for (unsigned interval = 5; interval <= 100; interval += 95) {
        calibrated(100, 200); config[5] = interval; config[4] = 2;
        config[17] = config[53] = 0; config[18] = 'a'; config[54] = 'b';
        hall.armed = 1; now = ULONG_MAX - 20; hall.pressed = 1; handle_double_click();
        unsigned long first = now;
        now += 2; hall.pressed = 0; handle_double_click();
        now = first + interval * 10 - 1; handle_double_click(); assert(!presses);
        now++; hall.pressed = 1; handle_double_click(); // Exact deadline is not a double click.
        assert(presses == 1 && lastKey == 'a' && doubleState == 1);
        now += 2; hall.pressed = 0; handle_double_click();
        now += 2; hall.pressed = 1; handle_double_click(); assert(presses == 2 && lastKey == 'b');
        hall.pressed = 0; handle_double_click(); assert(!doubleState);
    }
    puts("PASS 50/1000 ms windows, exact deadline, new click and clock wrap");

    for (unsigned hue = 0; hue < 256; ++hue) {
        CHSV hsv = {hue, 255, 255}; CRGB rgb; hsv2rgb(&hsv, &rgb);
        unsigned region = hue / 43, remainder = (hue - region * 43) * 6;
        uint8_t q = (255U * (255U - ((255U * remainder) >> 8))) >> 8;
        uint8_t t = (255U * (255U - ((255U * (255U - remainder)) >> 8))) >> 8;
        uint8_t expected[6][3] = {{255,t,0},{q,255,0},{0,255,t},{0,q,255},{t,0,255},{255,0,q}};
        assert(rgb.r == expected[region][0] && rgb.g == expected[region][1] && rgb.b == expected[region][2]);
    }
    puts("PASS all 256 HUE values after integer-width optimization");
    command(999, 5);
    assert(strcmp(tx, "[1003,2,6,1,1]\n") == 0);
    assert(config[0] == 6);
    puts("PASS firmware release query is independent of config format and declares manual ISP support");
    command(999, 4); assert(strcmp(tx, "[1002,255]\n") == 0);
    calibrated(100, 200); samples(100, 3); samples(160, 2); assert(hall.pressed);
    command(999, 10); command(92, 65); command(999, 11); assert(capture);
    unsigned beforeWrites = writes, beforePresses = presses, beforeReleases = releases;
    set_pixel_for_GRB_LED(ledData, 0, 255, 128, 64);
    neopixel_show_P1_4(ledData, NUM_BYTES);
    unsigned beforeLedShows = ledShows;
    uint8_t savedLighting[7]; memcpy(savedLighting, config + 10, 7);
    txpos = 0; tx[0] = 0;
    input("{999:99}{999:0}"); ack(99, 0);
    assert(bootPending && !capture && !settingsOpen && !hall.pressed && !doubleState);
    assert(releases > beforeReleases && !bootEntries);
    assert(ledShows == beforeLedShows + 1 && !shownLed[0] && !shownLed[1] && !shownLed[2]);
    assert(memcmp(savedLighting, config + 10, 7) == 0);
    now += 299; loop(); assert(!bootEntries && writes == beforeWrites && presses == beforePresses);
    connected = 0; ++now; loop(); assert(bootEntries == 1 && writes == beforeWrites);
    assert(ledShows == beforeLedShows + 1);
    command(92, 70); assert(config[92] == 65 && txpos == 0);
    puts("PASS manual ISP ACK, grace time, HID release, command drain stop and no flash write");

    defaults(); bootEntries = 0; now = ULONG_MAX - 150;
    command(999, 99); ack(99, 0); now += 299; loop(); assert(!bootEntries);
    ++now; loop(); assert(bootEntries == 1);
    puts("PASS manual ISP delay across timer wrap");

    native_linear_tests();
    identity_light_tests();
    linear_reverse_tests();
    factory_reset_tests();
    assert(sizeof(HallSettings) == 11 && CONFIG_INDEX_LAST == 137);
    puts("All host firmware scenarios passed (hardware drivers are mocked).");
}

