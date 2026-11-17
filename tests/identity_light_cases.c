static void identity_light_tests(void) {
    calibrated(100, 200); connected = 0; config[4] = 3; config[124] = 4;
    config[10] = 255; config[11] = config[12] = 0; config[13] = 200;
    for (unsigned mode = 3; mode <= 4; ++mode) {
        config[14] = mode;
        for (unsigned position = 0; position <= 100; position += 25) {
            hall.position = position; now += 10; handle_color_effect();
            assert(shownLed[1] == (mode == 3 ? position * 2 : (100 - position) * 2));
            assert(!shownLed[0] && !shownLed[2]);
        }
    }
    for (unsigned mode = 5; mode <= 6; ++mode) {
        config[14] = mode;
        for (unsigned reverse = 0; reverse < 2; ++reverse) {
            config[15] = reverse ? 255 : 0; config[16] = reverse ? 0 : 255;
            for (unsigned position = 0; position <= 100; ++position) {
                hall.position = position; now += 10; handle_color_effect();
                CHSV hsv = {reverse ? 255 - 255 * position / 100 : 255 * position / 100,255,255};
                CRGB rgb; hsv2rgb(&hsv, &rgb);
                unsigned level = mode == 5 ? 200 : position * 2;
                assert(shownLed[1] == rgb.r * level / 255 && shownLed[0] == rgb.g * level / 255 && shownLed[2] == rgb.b * level / 255);
            }
        }
        hall.fault = 1; now += 10; handle_color_effect(); assert(!(shownLed[0] | shownLed[1] | shownLed[2]));
        hall.fault = 0; hallSettings.calibrated = 0; now += 10; handle_color_effect(); assert(!(shownLed[0] | shownLed[1] | shownLed[2]));
        hallSettings.calibrated = 1;
    }
    config[14] = 3; hall.position = 100; now = 65530; handle_color_effect();
    hall.position = 0; now = 65540; handle_color_effect(); assert(!(shownLed[0] | shownLed[1] | shownLed[2]));
    puts("PASS travel LED brightness/inversion, all positions in both hue directions, combined mode, fault/uncalibrated off and timer wrap without host");

    calibrated(100, 200); config[6] = 12; config[4] = 3; config[124] = 7;
    for (unsigned i = 100; i < 124; ++i) config[i] = (i & 1) ? 0x4e : 0x2d;
    uint8_t expected[137];
    for (unsigned mode = 0; mode <= 6; ++mode) {
        config[14] = mode; config[15] = 0; config[16] = 255;
        assert(validate_config()); config2eeprom(); memcpy(expected, config, sizeof(config));
        memset(config, 0, sizeof(config)); eeprom2config();
        assert(validate_config() && !memcmp(expected, config, sizeof(config)));
    }
    config[14] = 7; assert(!validate_config()); config[14] = 2;
    // A genuine V4 packed image has no high lighting bit in its name-length byte.
    config[0] = 4; config2eeprom(); flash[0] = 4; memcpy(expected, config, sizeof(config)); expected[0] = 6;
    setup(); assert(!memcmp(expected, config, sizeof(config)) && usbNameLength == 12);
    puts("PASS all seven LED modes persist with maximum custom name; V4 upgrades preserve native mode and name");

    chipInfo[0] = 0x50; chipInfo[1] = 2; memcpy(chipInfo+2, "\x32\x42\xd1\xbe\x00", 5);
    unsigned oldWrites = writes, oldPresses = presses, oldReleases = releases;
    command(999, 6); assert(!strcmp(tx, "[1004,80,2,50,66,209,190,0]\n"));
    assert(writes == oldWrites && presses == oldPresses && releases == oldReleases);
    puts("PASS identity query reads cached ROM data without flash writes or key output");

    // Exhaustively compare all raw values and fixed-point accumulator values.
    for (unsigned filter = 0; filter <= 3; ++filter) {
        hallSettings.filter = filter;
        for (unsigned raw = 0; raw < 256; ++raw) {
            for (unsigned accumulator = 0; accumulator <= 4080; ++accumulator) {
                hall.initialized = 1; hall.accumulator = accumulator;
                int expectedValue = accumulator + ((int)(raw * 16) - (int)accumulator) / (1 << filter);
                hall_sample(raw); assert(hall.accumulator == expectedValue);
            }
        }
    }
    puts("PASS fixed-point ADC filter is equivalent for all raw/accumulator values and all smoothing levels");
}
