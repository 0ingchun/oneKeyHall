static unsigned descriptor(uint8_t type, uint8_t index, unsigned requested, uint8_t *out) {
    setup.wValueH = type; setup.wValueL = index; SetupReq = USB_GET_DESCRIPTOR; SetupLen = requested;
    uint8_t n = descriptorSetup(); assert(n != 255); unsigned total = n; memcpy(out, Ep0Buffer, n);
    while (SetupLen) { USB_EP0_IN(); memcpy(out + total, Ep0Buffer, UEP0_T_LEN); total += UEP0_T_LEN; }
    USB_EP0_IN(); assert(UEP0_T_LEN == 0); return total;
}
static void report_layout(void) {
    unsigned bits[3][6] = {{0}}, size = 0, count = 0, id = 0, page = 0, depth = 0, top = 0;
    for (unsigned pos = 0; pos < ReportDescLen;) {
        uint8_t tag = ReportDesc[pos++]; unsigned n = tag & 3, value = 0;
        if (n == 3) n = 4;
        assert(pos + n <= ReportDescLen);
        for (unsigned j = 0; j < n; ++j) value |= (unsigned)ReportDesc[pos++] << (j * 8);
        switch (tag & 0xfc) {
            case 0x04: page = value; break;
            case 0x08: if (page == 1) assert(value < 0x80 || value > 0x83); break; // no System Power/Sleep/Wake
            case 0x74: size = value; break;
            case 0x94: count = value; break;
            case 0x84: id = value; assert(id >= 1 && id <= 5); break;
            case 0x80: bits[0][id] += size * count; break;
            case 0x90: bits[1][id] += size * count; break;
            case 0xb0: bits[2][id] += size * count; break;
            case 0xa0: if (!depth++) ++top; break;
            case 0xc0: assert(depth); --depth; break;
        }
    }
    assert(!depth && top == 4);
    assert(bits[0][1] == 64 && bits[0][2] == 32 && bits[0][3] == 8 && bits[0][4] == 96 && !bits[0][5]);
    assert(bits[1][1] == 8 && bits[2][5] == 8);
    assert(CfgDesc[97] == 16 && CfgDesc[99] == 10); // EP3 size/interval.
}
int main(void) {
    uint8_t name[24], out[512];
    const uint16_t expectedBrand[] = {0x0316,'o','n','e','K','e','y','H','a','l','l'};
    assert(Prod_DesLen == sizeof(expectedBrand) && !memcmp(Prod_Des, expectedBrand, sizeof(expectedBrand)));
    for (unsigned i = 0; i < 24; i++) name[i] = (i & 1) ? 0x78 : 0xcf;
    USBPrepareName(name, 0);
    assert(descriptor(3, 2, 255, out) == 42);
    const char *automatic = "oneKeyHall3242D1BE00";
    for (unsigned i = 0; i < 20; ++i) assert(out[2+i*2] == automatic[i] && !out[3+i*2]);
    assert(descriptor(3, 4, 255, out) == 42 && !memcmp(out, customName, 42));
    assert(descriptor(3, 1, 255, out) == sizeof(expectedBrand) && !memcmp(out, expectedBrand, sizeof(expectedBrand)));
    assert(descriptor(3, 2, 2, out) == 2 && out[0] == 42 && out[1] == 3);
    assert(descriptor(3, 4, 9, out) == 9 && !memcmp(out, customName, 9));
    USBPrepareName(name, 12); // Maximum 26-byte UTF-16 string crosses four EP0 packets.
    assert(descriptor(3, 2, 255, out) == 26 && out[0] == 26 && out[1] == 3 && !memcmp(out+2, name, 24));
    assert(descriptor(3, 4, 255, out) == 26 && !memcmp(out+2, name, 24));
    assert(descriptor(3, 2, 2, out) == 2 && out[0] == 26 && out[1] == 3);
    assert(descriptor(3, 2, 9, out) == 9 && !memcmp(out+2, name, 7));
    assert(descriptor(1, 0, 255, out) == DevDescLen && !memcmp(out, DevDesc, DevDescLen));
    assert(descriptor(2, 0, 255, out) == CfgDescLen && !memcmp(out, CfgDesc, CfgDescLen));
    assert(descriptor(0x22, 0, 65535, out) == ReportDescLen && !memcmp(out, ReportDesc, ReportDescLen));
    assert(descriptor(0x21, 0, 255, out) == 9 && !memcmp(out, CfgDesc + 84, 9));
    assert(descriptor(3, 3, 255, out) == SerDesLen && !memcmp(out, SerDes, SerDesLen));
    assert(descriptor(3, 0, 255, out) == LangDesLen && !memcmp(out, LangDes, LangDesLen));
    report_layout();
    setup.bRequestType = 2; setup.wValueH = setup.wValueL = setup.wIndexH = 0;
    const uint8_t endpoints[] = {0x81,0x82,0x83,2};
    uint8_t *registers[] = {&UEP1_CTRL,&UEP2_CTRL,&UEP3_CTRL,&UEP2_CTRL};
    for (unsigned i = 0; i < 4; ++i) {
        setup.wIndexL = endpoints[i]; *registers[i] = 0xff;
        uint8_t mask = i == 3 ? (bUEP_R_TOG | MASK_UEP_R_RES) : (bUEP_T_TOG | MASK_UEP_T_RES);
        SetupReq = USB_SET_FEATURE; assert(featureSetup() == 0);
        assert(*registers[i] == (uint8_t)((0xff & ~mask) | (i == 3 ? UEP_R_RES_STALL : UEP_T_RES_STALL)));
        SetupReq = USB_CLEAR_FEATURE; assert(featureSetup() == 0);
        assert(*registers[i] == (uint8_t)((0xff & ~mask) | (i == 3 ? UEP_R_RES_ACK : UEP_T_RES_NAK)));
    }
    uint8_t saved[] = {UEP1_CTRL,UEP2_CTRL,UEP3_CTRL};
    const uint8_t invalid[] = {0,1,3,4,0x80,0x84};
    for (unsigned i = 0; i < sizeof(invalid); ++i) { setup.wIndexL = invalid[i]; assert(featureSetup() == 255); }
    setup.wIndexL = 0x83; setup.wValueL = 1; assert(featureSetup() == 255); setup.wValueL = 0;
    setup.wIndexH = 1; assert(featureSetup() == 255); setup.wIndexH = 0;
    setup.bRequestType = 0; assert(featureSetup() == 255);
    assert(UEP1_CTRL == saved[0] && UEP2_CTRL == saved[1] && UEP3_CTRL == saved[2]);
    puts("PASS endpoint HALT set/clear, DATA0 reset and rejection of undeclared endpoints/remote wakeup");
    setup.bRequestType = 0xa1; setup.wIndexL = 2; setup.wValueH = 3; setup.wValueL = 5;
    SetupReq = 1; SetupLen = 2;
    assert(classSetup() == 2 && Ep0Buffer[0] == 5 && Ep0Buffer[1] == 1);
    SetupLen = 1; assert(classSetup() == 1); setup.wValueL = 4; assert(classSetup() == 255);
    SetupReq = 11; setup.wValueL = 0; assert(classSetup() == 0 && HidProtocol == 0 && HidEpoch == 1);
    setup.wValueL = 2; assert(classSetup() == 255 && HidProtocol == 0);
    setup.wValueL = 1; assert(classSetup() == 0 && HidProtocol == 1 && HidEpoch == 2);
    SetupReq = 3; SetupLen = 1; assert(classSetup() == 1 && Ep0Buffer[0] == 1);
    SetupReq = 9; setup.wValueH = 2; assert(classSetup() == 0);
    setup.wValueL = 4; assert(classSetup() == 255);
    setup.wIndexL = 1; assert(classSetup() == 255);
    puts("PASS USB strings/descriptor packetization, report bit layouts, touch max-count feature and boot/report protocol");
}
