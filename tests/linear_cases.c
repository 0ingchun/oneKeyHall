static void tick_linear(unsigned count) {
    while (count--) { now += 10; linear_task((uint16_t)now, config[4] == 3 && !settingsOpen); }
}
static void start_linear(uint8_t preset) {
    calibrated(100, 200); config[4] = 3; config[124] = preset;
    now += 20; linear_task((uint16_t)now, 0); hidPackets = 0;
    hall.armed = 1; hall.position = hall.pressed = 0;
}
static void native_linear_tests(void) {
    start_linear(4); tick_linear(10); assert(!hidPackets);
    hall.pressed = 1; hidAccept = 0; tick_linear(5); assert(!hidPackets);
    hidAccept = 1; tick_linear(1);
    assert(hidPackets == 1 && hidLog[0].id == 2 && hidLog[0].length == 4);
    assert(hidLog[0].bytes[0] == 1 && !hidLog[0].bytes[1] && !hidLog[0].bytes[2] && !hidLog[0].bytes[3]);
    tick_linear(20); assert(hidPackets == 1); hall.pressed = 0; tick_linear(1);
    assert(hidPackets == 2 && !hidLog[1].bytes[0]);
    hall.pressed = 1; tick_linear(1); command(999, 10); tick_linear(1);
    assert(hidPackets == 4 && !hidLog[3].bytes[0]); command(999, 14);
    puts("PASS native cursor click: no motion, held button, USB busy retry and settings release");

    start_linear(4); connected = 0; samples(100, 30); samples(170, 30);
    assert(hidPackets == 1 && hidLog[0].bytes[0] == 1 && !presses);
    samples(100, 30); assert(hidPackets == 2 && !hidLog[1].bytes[0]);
    samples(170, 30); samples(255, 30); assert(hidPackets == 4 && !hidLog[3].bytes[0]);
    assert(!hall.armed && hall.fault);
    puts("PASS native mode runs without CDC connection; ADC rail fault releases input");

    start_linear(2); hall.position = 100; tick_linear(100);
    assert(hidPackets == 30);
    for (unsigned i = 0; i < hidPackets; ++i) assert(hidLog[i].id == 2 && hidLog[i].bytes[3] == 1 && !hidLog[i].bytes[0]);
    hall.position = 0; tick_linear(100); assert(hidPackets == 30);
    start_linear(3); config[125] = 1; config[99] = 2; hall.position = 51;
    tick_linear(199); assert(!hidPackets); tick_linear(1); assert(hidPackets == 1 && hidLog[0].bytes[3] == 255);
    hidAccept = 0; tick_linear(1000); hidAccept = 1; tick_linear(1);
    assert(hidPackets == 2); tick_linear(100); assert(hidPackets == 2); // No accumulated burst.
    puts("PASS wheel endpoints, 30 Hz full travel, fractional 0.5 Hz and bounded busy backlog");

    for (uint8_t preset = 0; preset < 2; ++preset) {
        start_linear(preset); tick_linear(200);
        assert(hidPackets == 200);
        for (unsigned i = 0; i < 200; ++i) assert(hidLog[i].id == 3 && hidLog[i].bytes[0] == (i % 2 ? 0 : 2));
        tick_linear(100); assert(hidPackets == (preset ? 300 : 200));
        if (preset) for (unsigned i = 200; i < 300; ++i) assert(hidLog[i].bytes[0] == (i % 2 ? 0 : 1));
        hall.position = 100; tick_linear(100); assert(hidPackets == (preset ? 400 : 300));
        for (unsigned i = hidPackets - 100; i < hidPackets; ++i) assert(hidLog[i].bytes[0] == (i % 2 ? 0 : preset ? 2 : 1));
        unsigned before = hidPackets; tick_linear(100); assert(hidPackets == before);
        command(999, 16); ack(16, 0); tick_linear(100); assert(!hall.armed && hidPackets == before);
        hall.armed = 1; hall.position = 0; tick_linear(1); assert(hidLog[hidPackets - 1].bytes[0] == 2);
        hidReady = 0; tick_linear(20); hidReady = 1; tick_linear(1); assert(!hidLog[hidPackets - 1].bytes[0]);
    }
    puts("PASS volume zero-sync, both directions, press/release pacing, stop at estimate, resync and suspend release");

    for (uint8_t preset = 5; preset <= 7; ++preset) {
        start_linear(preset); config[99] = 2;
        config[129] = 0x34; config[130] = 0x12; config[131] = 0x78; config[132] = 0x56;
        tick_linear(10); assert(!hidPackets);
        hall.position = 3; tick_linear(1); assert(!hidPackets); // Contact onset hysteresis.
        hall.position = 51; tick_linear(1); assert(hidPackets == 1);
        assert(hidLog[0].id == 4 && hidLog[0].length == 12 && hidLog[0].bytes[0] == 1 && hidLog[0].bytes[1] == 0);
        assert(!memcmp(hidLog[0].bytes + 2, config + 129, 4));
        assert(hidLog[0].bytes[11] == 1 && hidLog[0].bytes[10] == (preset == 5 ? 255 : 128));
        unsigned width = hidLog[0].bytes[6] | hidLog[0].bytes[7] << 8;
        assert(!memcmp(hidLog[0].bytes + 6, hidLog[0].bytes + 8, 2));
        // Area = 0.13% at half travel (pressure-only fixes 0.01%). Allow integer sqrt quantization.
        double area = (double)width * width * 100 / (32767.0 * 32767.0);
        assert(preset == 6 ? area > .009 && area <= .01 : area > .122 && area <= .13);
        hall.position = 100; tick_linear(1); assert(hidLog[1].bytes[10] == 255);
        unsigned bottomWidth = hidLog[1].bytes[6] | hidLog[1].bytes[7] << 8;
        assert(preset == 6 ? bottomWidth == width : bottomWidth > width);
        hall.position = 0; hidAccept = 0; tick_linear(4); assert(hidPackets == 2);
        hidAccept = 1; tick_linear(1); assert(hidPackets == 3 && !hidLog[2].bytes[0] && hidLog[2].bytes[11] == 1);
        assert(!memcmp(hidLog[2].bytes + 1, hidLog[1].bytes + 1, 9));
        tick_linear(10); assert(hidPackets == 3);
    }
    puts("PASS touch fixed XY, contact lifetime, area/pressure interpolation and busy-safe lift");

    start_linear(4); now = 65530; tick_linear(1); hall.pressed = 1; tick_linear(1);
    assert(hidPackets == 1); ++HidEpoch; adc = 170; ++now; loop(); tick_linear(1);
    assert(!hall.armed && !hidLog[hidPackets - 1].bytes[0]);
    puts("PASS native timer wrap and USB epoch change releases/requires top rearm");

    calibrated(100, 200); config[4] = 3; config[124] = 7; config[125] = 100;
    config[126] = 10; config[127] = 90; config[128] = 60;
    config[129] = 255; config[130] = 127; config[131] = config[132] = 0;
    config[133] = 2; config[134] = 250; config[135] = 0; config[136] = 180;
    config[6] = 12; for (unsigned i = 100; i < 124; ++i) config[i] = (i % 2) ? 0x4e : 0x2d;
    for (unsigned i = 23; i < 53; ++i) config[i] = 'a' + i % 26;
    for (unsigned i = 59; i < 89; ++i) config[i] = 'A' + i % 26;
    config[14] = 2; config[17] = config[53] = 3; config[94] = 1; config[97] = 3; config[98] = 10;
    assert(validate_config()); clickCount = 65535;
    config2eeprom(); uint8_t expected[137]; memcpy(expected, config, sizeof(config));
    memset(config, 0, sizeof(config)); eeprom2config(); assert(!memcmp(expected, config, sizeof(config)));
    assert(validate_config());
    puts("PASS packed 128-byte EEPROM roundtrip retains full texts/name/RT/linear parameters and counter");

    config[0] = 3; memcpy(flash, config, 124); flash[124] = config_crc(124); setup();
    assert(config[0] == 6 && config[4] == 0 && config[124] == 4 && config[125] == 30);
    assert(!memcmp(config + 5, expected + 5, 119));
    puts("PASS v3 CRC migration preserves name/texts/calibration and prevents old mode from starting new outputs");
}
