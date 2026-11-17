static void linear_reverse_tests(void) {
    for (unsigned preset = 0; preset <= 7; ++preset) {
        start_linear(preset); config[124] |= preset == 4 ? 0 : 128;
        unsigned oldWrites = writes;
        for (unsigned pair = 0; pair < 2; ++pair) {
            samples(160,2); samples(100,2); samples(160,2);
            assert(linearReverse == (preset == 4 ? 0 : !pair));
            samples(100,2); assert(clickCount == (pair+1)*2);
        }
        assert(writes == oldWrites && config[124] == (preset | (preset == 4 ? 0 : 128)));
    }
    start_linear(2); samples(160,2); samples(100,2); samples(160,2); samples(100,2);
    assert(clickCount == 2 && !linearReverse);
    puts("PASS optional double-click reverse toggles all reversible presets; cursor excluded; every preset counts releases without Flash writes");

    for (unsigned interval = 5; interval <= 100; interval += 95) {
        start_linear(2); config[124] |= 128; config[5] = interval; now = 65520;
        hall.pressed = 1; handle_linear_click(); unsigned long first = now;
        now++; hall.pressed = 0; handle_linear_click();
        now = first + interval*10-1; hall.pressed = 1; handle_linear_click(); assert(linearReverse == 1);
        now++; hall.pressed = 0; handle_linear_click();
        now++; hall.pressed = 1; handle_linear_click(); first = now;
        now++; hall.pressed = 0; handle_linear_click();
        now = first + interval*10; hall.pressed = 1; handle_linear_click(); assert(linearReverse == 1);
        now++; hall.pressed = 0; handle_linear_click();
        now += interval*10; handle_linear_click(); assert(!doubleState);
        now += 65536; hall.pressed = 1; handle_linear_click(); assert(linearReverse == 1);
    }
    start_linear(2); config[124] |= 128;
    samples(160,2); samples(255,2); assert(clickCount == 0 && !doubleState && !previousButton);
    samples(100,3); samples(160,2); command(999,10); samples(100,5); assert(clickCount == 0 && !linearReverse);
    command(999,14); samples(100,3); samples(160,2); samples(100,2); assert(clickCount == 1);
    puts("PASS configurable double window, exact deadline, 16-bit timer wrap/long idle; ADC faults/settings do not count or preserve a pending gesture");

    start_linear(2); hall.position = 100; tick_linear(10); unsigned before = hidPackets;
    assert(before == 3 && hidLog[before-1].bytes[3] == 1); linearReverse = 1; tick_linear(10);
    assert(hidPackets == before+3 && hidLog[hidPackets-1].bytes[3] == 255);
    start_linear(0); tick_linear(200); before = hidPackets; linearReverse = 1; tick_linear(100);
    assert(hidPackets == before+100 && hidLog[before].bytes[0] == 1);
    hall.position = 100; before = hidPackets; tick_linear(100); assert(hidPackets == before+100 && hidLog[before].bytes[0] == 2);
    for (unsigned preset=5; preset<=7; ++preset) {
        start_linear(preset); hall.position = 100; tick_linear(1);
        unsigned width = hidLog[0].bytes[6] | hidLog[0].bytes[7]<<8;
        linearReverse=1; tick_linear(1);
        unsigned reversedWidth = hidLog[1].bytes[6] | hidLog[1].bytes[7]<<8;
        assert(hidLog[1].bytes[0] == 1 && (preset==6 ? reversedWidth==width : reversedWidth<width));
        assert(hidLog[1].bytes[10] == (preset==5 ? 255 : 1));
        hall.position=0; tick_linear(2); assert(!hidLog[hidPackets-1].bytes[0]);
    }
    puts("PASS reversed wheel/volume/area/pressure HID output; touch still lifts at rest");

    start_linear(7); config[124] |= 128; config[14]=6; config[6]=1; config[100]='X';
    config2eeprom(); linearReverse=1; setup(); assert(config[124]==135 && !linearReverse && config[14]==6 && config[100]=='X');
    assert(validate_config()); config[124]=132; assert(!validate_config()); config[124]=8; assert(!validate_config());
    config[124]=7; config[0]=5; config2eeprom(); flash[0]=5; setup(); assert(config[0]==6 && config[124]==7 && config[14]==6 && config[100]=='X');
    linearReverse=1; command(999,3); assert(strstr(tx, ",1]\n"));
    puts("PASS reverse opt-in persists with name/lights; runtime direction resets; V5 migration and direction telemetry");
}
