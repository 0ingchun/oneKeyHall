export const commands = [
  [
    0,
    "保存配置",
    "Save configuration",
    "设置会话内：校验、写 DataFlash、回读、结束设置，等待松开。",
    "Within a settings session: validate, save/verify DataFlash, end settings and require release.",
    "ACK"
  ],
  [
    1,
    "读取配置",
    "Read configuration",
    "返回 137 个字节；索引 2–3 是实时累计释放次数。",
    "Returns 137 bytes; indices 2–3 contain the live release count.",
    "[6,...]"
  ],
  [
    2,
    "更新常亮灯光",
    "Refresh solid LED",
    "立即更新常亮 RGB；其他灯效由设备循环更新。",
    "Refreshes solid RGB immediately. Other effects update in the device loop.",
    "ACK"
  ],
  [
    3,
    "读取实时状态",
    "Read live status",
    "含行程、RT 极值和运行中的反向状态，见下方字段。",
    "Travel, RT extremes and runtime reversal; see status fields below.",
    "[1001,...]"
  ],
  [
    4,
    "读取能力位",
    "Read capability bits",
    "当前 V2.6.1 支持 ISP，能力值 255。",
    "Current V2.6.1 supports ISP; capability bits: 255.",
    "[1002,bits]"
  ],
  [
    5,
    "读取应用版本",
    "Read application version",
    "最后一项固定为 1，表示支持 ISP；界面仅显示版本号。",
    "The final field is always 1, indicating ISP support. The UI displays the version number only.",
    "[1003,2,6,1,1]"
  ],
  [
    6,
    "读取引导版本及芯片序列号",
    "Read boot version and chip UID",
    "BootLoader BCD 低字节/高字节；未知版本为 0,0；UID 顺序是 3FFC–3FFF、3FFA。",
    "BootLoader BCD low/high bytes; unknown version is 0,0. UID byte order: 3FFC–3FFF, then 3FFA.",
    "[1004,bcdLow,bcdHigh,uid0,uid1,uid2,uid3,uid4]"
  ],
  [
    10,
    "开始设置",
    "Begin settings",
    "备份、暂停输出；重复调用不覆盖备份。",
    "Backs up settings and pauses output; repeated calls retain the original backup.",
    "ACK"
  ],
  [
    11,
    "采集松开端点",
    "Capture released endpoint",
    "需已开始设置，静止采集 32 次，结束后应答。",
    "Requires settings mode; captures 32 stable samples before replying.",
    "ACK"
  ],
  [
    12,
    "采集压到底端点",
    "Capture bottom endpoint",
    "需先成功执行 11；与顶部至少相差 16 个 ADC 计数。",
    "Requires a successful command 11; endpoint span must be at least 16 ADC counts.",
    "ACK"
  ],
  [
    13,
    "应用但不保存",
    "Apply without saving",
    "设置会话内：校验并应用 RAM，结束设置并等待松开。",
    "Within a settings session: validate/apply RAM, end settings and require release.",
    "ACK"
  ],
  [
    14,
    "放弃设置",
    "Cancel settings",
    "恢复设置前的配置；释放输出并等待松开。",
    "Restores the backup, releases outputs and requires release.",
    "ACK"
  ],
  [
    15,
    "恢复出厂设置",
    "Restore factory settings",
    "V2.6.1 起支持；采样中拒绝。清除全部配置、校准、名称和计数，写入并校验 DataFlash；无需设置会话。完成后重新校准，拔插 USB 更新名称。",
    "From V2.6.1; rejected during capture. Clears settings, calibration, name and count, then saves/verifies DataFlash. No settings session required. Recalibrate and reconnect USB for the default name.",
    "ACK"
  ],
  [
    16,
    "重新同步输出",
    "Resynchronize output",
    "释放输出、复位临时反向，等待回顶部；音量重新归零估算，不写 Flash。",
    "Releases outputs, resets temporary reversal, and requires rest. Volume re-zeroes its estimate; no Flash write.",
    "ACK"
  ],
  [
    99,
    "进入 ISP",
    "Enter ISP",
    "仅支持 ISP 的固件接受：关灯、成功应答、等待 300 ms 后交接。不是烧录命令。",
    "ISP-enabled firmware only: LED off, successful reply, 300 ms grace, then handoff. Does not flash firmware.",
    "[1000,99,0/1]"
  ]
];
export const fields = [
  [
    "0",
    "配置格式 6，只读；V04/V05 同为 137 字节。",
    "Config format 6, read-only; V04/V05 also use 137 bytes."
  ],
  [
    "1",
    "产品类型 0，只读。",
    "Product type 0, read-only."
  ],
  [
    "2–3",
    "累计释放次数，高字节在前；0–65535 循环，只读。",
    "Release count, high byte first; wraps at 65535; read-only."
  ],
  [
    "4",
    "工作模式：0 KEY1，1 KEY2，2 单/双击，3 线性。",
    "Work mode: 0 KEY1, 1 KEY2, 2 single/double click, 3 linear."
  ],
  [
    "5",
    "双击间隔：5–100，单位 10 ms；用于按键双击和线性双击反向。",
    "Double-click interval: 5–100 in 10 ms units; shared by key double-click and linear reversal."
  ],
  [
    "6",
    "自定义名称长度：0–12 个 BMP 字符；0 自动使用 oneKeyHall 加 UID。",
    "Custom name length: 0–12 BMP characters; 0 uses oneKeyHall plus UID."
  ],
  [
    "7–9",
    "保留，不使用、不持久化。",
    "Reserved; unused and not persisted."
  ],
  [
    "10–12",
    "灯光 R/G/B，各 0–255。",
    "LED R/G/B, each 0–255."
  ],
  [
    "13",
    "灯光最大亮度 0–255。",
    "LED maximum brightness, 0–255."
  ],
  [
    "14",
    "灯效：0 常亮，1 呼吸，2 时间色相，3 行程亮度，4 反向亮度，5 行程色相，6 颜色亮度联动。",
    "LED: 0 solid, 1 breathing, 2 timed hue, 3 travel brightness, 4 inverse brightness, 5 travel hue, 6 hue and brightness."
  ],
  [
    "15–16",
    "灯效间隔/步长；灯效 5/6 时是松开/压到底色相（0–255）。",
    "LED interval/step; in effects 5/6 these are released/bottom-out hue (0–255)."
  ],
  [
    "17 / 53",
    "KEY1 / KEY2 输出：0 单键保持，1 组合键立即释放，2 组合键保持，3 ASCII 文本。",
    "KEY1 / KEY2 output: 0 held key, 1 chord tap, 2 held chord, 3 ASCII text."
  ],
  [
    "18–22 / 54–58",
    "两套组合键，各最多 5 个 Arduino Keyboard 编码，0 或 255 结束。",
    "Two chords, up to 5 Arduino Keyboard key codes each; 0 or 255 terminates."
  ],
  [
    "23–52 / 59–88",
    "两套文本，各最多 30 字节 ASCII；0 或 255 结束。",
    "Two texts, up to 30 ASCII bytes each; 0 or 255 terminates."
  ],
  [
    "89",
    "校准标志 0/1，只读，由端点采集更新。",
    "Calibration flag 0/1, read-only; updated by endpoint capture."
  ],
  [
    "90–91",
    "顶部/底部 ADC，只读；端点 2–253，绝对跨度至少 16。",
    "Rest/bottom ADC, read-only; endpoints 2–253 with absolute span at least 16."
  ],
  [
    "92",
    "按下触发点 5–95%。",
    "Actuation threshold, 5–95%."
  ],
  [
    "93",
    "释放点：顶部死区 ≤ 释放点 < 触发点。",
    "Release threshold: top deadzone ≤ release < actuation."
  ],
  [
    "94",
    "RT 开关 0/1，不能与工作模式 2 同时开启。",
    "RT enable 0/1; incompatible with work mode 2."
  ],
  [
    "95–96",
    "RT 重新按下/抬起距离，各 1–50%；最少 2 ADC 计数。",
    "RT repress/release distances, 1–50% each; minimum 2 ADC counts."
  ],
  [
    "97",
    "滤波等级 0–3：关闭、1/2、1/4、1/8。",
    "Filter level 0–3: off, 1/2, 1/4, 1/8."
  ],
  [
    "98",
    "状态确认连续采样数 1–10。",
    "Consecutive confirmation samples, 1–10."
  ],
  [
    "99",
    "顶部死区 1–10%。",
    "Top deadzone, 1–10%."
  ],
  [
    "100–123",
    "名称 UTF-16LE，最多 12 个 BMP 字符；禁止控制字符与代理码元。",
    "Name in UTF-16LE, up to 12 BMP characters; no controls or surrogates."
  ],
  [
    "124",
    "低 3 位是线性预设 0–7；bit 7 启用双击反向；bit 3–6 必须为 0。预设 4 不支持反向。",
    "Low 3 bits: linear preset 0–7. Bit 7 enables double-click reversal; bits 3–6 must be 0. Preset 4 cannot reverse."
  ],
  [
    "125",
    "滚轮最大速度 1–100 格/秒。",
    "Maximum wheel rate, 1–100 detents/s."
  ],
  [
    "126–127",
    "最低/最高音量 0–100%，最小值不大于最大值。",
    "Minimum/maximum volume, 0–100%; min ≤ max."
  ],
  [
    "128",
    "音量 0→100% 的估算步数 1–100，默认 50。",
    "Estimated steps from 0 to 100% volume, 1–100; default 50."
  ],
  [
    "129–132",
    "固定触控 X、Y：各 16 位小端，0–32767，默认居中。",
    "Fixed touch X and Y: each 16-bit little-endian, 0–32767; centered by default."
  ],
  [
    "133–134",
    "最小/最大面积 1–250，单位屏幕面积的 0.01%，最小值不大于最大值。",
    "Minimum/maximum area, 1–250 in 0.01% of screen area; min ≤ max."
  ],
  [
    "135–136",
    "最小/最大压力 0–255，最小值不大于最大值。",
    "Minimum/maximum pressure, 0–255; min ≤ max."
  ]
];
export const status = [
  [
    "raw",
    "原始 ADC",
    "Raw ADC"
  ],
  [
    "filtered",
    "滤波 ADC",
    "Filtered ADC"
  ],
  [
    "position",
    "相对行程 0–100%",
    "Relative travel 0–100%"
  ],
  [
    "pressed",
    "有效按下且未暂停",
    "Pressed and not paused"
  ],
  [
    "calibrated",
    "校准有效",
    "Valid calibration"
  ],
  [
    "armed",
    "已经松回顶部并就绪",
    "Armed after returning to rest"
  ],
  [
    "settingsOpen",
    "设置会话开启",
    "Settings session open"
  ],
  [
    "span",
    "校准跨度 ADC",
    "Calibration span in ADC counts"
  ],
  [
    "fault",
    "ADC ≤1 或 ≥254",
    "ADC ≤1 or ≥254"
  ],
  [
    "extreme",
    "RT 跟踪极值",
    "RT tracked extreme"
  ],
  [
    "cycle",
    "RT 周期有效",
    "RT cycle active"
  ],
  [
    "reversed",
    "相对预设临时反向 0/1（V2.6.0）",
    "Runtime reversal relative to preset, 0/1 (V2.6.0)"
  ]
];
export const presets = [
  [
    "0",
    "音量正向",
    "Volume normal"
  ],
  [
    "1",
    "音量反向",
    "Volume inverse"
  ],
  [
    "2",
    "滚轮向上",
    "Wheel up"
  ],
  [
    "3",
    "滚轮向下",
    "Wheel down"
  ],
  [
    "4",
    "当前光标鼠标左键，无面积/压力",
    "Mouse left button at cursor, no area/pressure"
  ],
  [
    "5",
    "固定坐标触控面积",
    "Fixed-coordinate touch area"
  ],
  [
    "6",
    "固定坐标触控压力",
    "Fixed-coordinate touch pressure"
  ],
  [
    "7",
    "固定坐标触控面积和压力",
    "Fixed-coordinate touch area and pressure"
  ]
];
export const errors = [
  [
    "0",
    "成功",
    "Success"
  ],
  [
    "1",
    "顺序、权限或命令不支持",
    "Invalid sequence/access or unsupported command"
  ],
  [
    "2",
    "参数组合无效",
    "Invalid parameter combination"
  ],
  [
    "3",
    "采样不稳定或 ADC 接近电源轨",
    "Unstable samples or ADC rail clipping"
  ],
  [
    "4",
    "端点跨度不足 16 ADC",
    "Endpoint span below 16 ADC counts"
  ],
  [
    "5",
    "保存回读不一致",
    "Save readback mismatch"
  ]
];
export const capabilities = [
  [
    "0",
    "手动 ISP",
    "Manual ISP"
  ],
  [
    "1",
    "RT 极值",
    "RT extremes"
  ],
  [
    "2",
    "线性模式",
    "Linear mode"
  ],
  [
    "3",
    "设备名称/双击间隔",
    "Name/double-click interval"
  ],
  [
    "4",
    "设备线性 HID",
    "Device linear HID"
  ],
  [
    "5",
    "BootLoader/UID 查询",
    "BootLoader/UID query"
  ],
  [
    "6",
    "行程灯效",
    "Travel lighting"
  ],
  [
    "7",
    "双击反向、方向状态、线性释放计数",
    "Double-click reversal, direction status, linear release counting"
  ]
];
