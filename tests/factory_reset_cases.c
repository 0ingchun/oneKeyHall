static void factory_reset_tests(void) {
    uint8_t expected[CONFIG_INDEX_LAST], before[CONFIG_INDEX_LAST], savedFlash[128];
    defaults(); memcpy(expected, config, sizeof(expected));
    calibrated(100, 200);
    config[6] = 1; config[100] = 'X'; config[5] = 50;
    config[18] = 'z'; config[13] = 17; config[14] = 6;
    config[124] = 130; config[125] = 95; clickCount = 12345;
    config2eeprom();
    command(999, 10); command(92, 70);
    command(999, 15); ack(15, 0);
    assert(!settingsOpen && !capture && !restCaptured && !clickCount && !hall_valid());
    assert(!memcmp(config, expected, sizeof(expected)));
    command(999, 14); ack(14, 0); // A stale settings backup must not undo reset.
    assert(!memcmp(config, expected, sizeof(expected)));
    setup();
    assert(!memcmp(config, expected, sizeof(expected)) && !clickCount);
    unsigned oldPresses = presses; samples(200, 20); assert(presses == oldPresses);
    puts("PASS factory reset clears all config/counts, persists across restart and requires calibration");

    calibrated(100, 200); config2eeprom();
    command(999, 10); command(999, 11);
    memcpy(before, config, sizeof(before)); memcpy(savedFlash, flash, sizeof(flash));
    unsigned oldWrites = writes;
    command(999, 15); ack(15, 1);
    assert(capture == 11 && settingsOpen && writes == oldWrites);
    assert(!memcmp(config, before, sizeof(before)) && !memcmp(flash, savedFlash, sizeof(flash)));
    command(999, 14);
    puts("PASS factory reset rejects active capture without changing RAM or flash");

    calibrated(100, 200); config[6] = 1; config[100] = 'Z'; clickCount = 9; config2eeprom();
    memcpy(savedFlash, flash, sizeof(flash)); command(999, 10); command(13, 90);
    flashFail = 1; command(999, 15); ack(15, 5); flashFail = 0;
    assert(!settingsOpen && !hall_valid() && !clickCount);
    assert(!memcmp(config, expected, sizeof(expected)) && !memcmp(flash, savedFlash, sizeof(flash)));
    command(999, 14); assert(!memcmp(config, expected, sizeof(expected)));
    command(999, 15); ack(15, 0); setup(); assert(!memcmp(config, expected, sizeof(expected)));
    puts("PASS factory reset reports storage failure, cannot restore stale backup and supports retry");

    for (uint8_t preset = 4; preset <= 5; ++preset) {
        start_linear(preset); hall.pressed = 1; hall.position = 60; tick_linear(2);
        assert(hidPackets && hidLog[hidPackets - 1].bytes[0]);
        command(999, 15); ack(15, 0); tick_linear(2);
        assert(!hidLog[hidPackets - 1].bytes[0] && !hall.armed && !config[89]);
    }
    puts("PASS factory reset releases held mouse and touch outputs before disabling uncalibrated input");
}
