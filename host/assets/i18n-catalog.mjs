// Exact source keys, translated as whole UI messages. Do not add user data.
export const messages = new Map([
["恢复出厂设置", "Restore factory settings"],
["清除设备名称、磁轴校准、按键映射、灯光、线性参数和累计释放次数，并立即保存。完成后需要重新校准，拔插 USB 后恢复默认名称。", "Clear the device name, Hall calibration, key mappings, lighting, linear settings and release count, and save immediately. Recalibrate afterward; reconnect USB to restore the default name."],
["连接设备后可恢复出厂设置。", "Connect a device to restore factory settings."],
["清除全部配置和计数并立即保存，完成后需要重新校准。", "Clear all settings and the count, and save immediately. Recalibration is required afterward."],
["恢复出厂设置需要 V2.6.1 或更新固件。", "Factory reset requires V2.6.1 or newer firmware."],
["已恢复出厂设置并保存。请重新校准；拔插 USB 后默认设备名称生效。", "Factory settings restored and saved. Recalibrate; reconnect USB to apply the default device name."],
["恢复出厂设置将清除设备名称、磁轴校准、按键映射、灯光、线性参数和累计释放次数，并立即保存到设备。此操作无法撤销。\n\n完成后需重新校准；拔插 USB 后恢复默认设备名称。确定继续？", "Factory reset clears the device name, Hall calibration, key mappings, lighting, linear settings and release count, and saves immediately. This cannot be undone.\n\nRecalibration is required afterward; reconnect USB to restore the default device name. Continue?"],

["参数修改后自动应用，不写入断电保存区；点击“保存配置”后断电保留。", "Changes apply automatically without writing to flash. Click Save configuration to keep them after power-off."],
["放弃待应用修改", "Discard pending changes"],
["进入校准会暂停键盘输出。每次采样时保持轴体静止；采集完底部后自动应用，点击“保存配置”后断电保留。", "Calibration pauses keyboard output. Hold the switch still for each capture. Capturing the bottom applies calibration automatically; Save configuration keeps it after power-off."],
["选择预设后自动应用，让设备进入线性模式。", "Selecting a preset automatically applies it and enables linear mode."],
["设备已进入线性模式，关闭网页后仍会运行。切换到 KEY1 / KEY2 后自动退出。", "Linear mode keeps running after this page closes. Selecting KEY1 / KEY2 automatically exits linear mode."],
["参数预览：有效参数将在停止修改后自动应用。", "Parameter preview: valid changes apply automatically after editing stops."],
["完成校准后自动应用，然后松开轴体。", "Calibration applies automatically when complete; then release the switch."],
["已读取校准会话中的参数；完成底部采集后自动应用。", "Read parameters from the calibration session. Capturing the bottom applies them automatically."],
["参数修改后自动应用到键盘，松回顶部即可运行；点击“保存配置”后断电保留。无需安装伴随程序，也无需保持网页或串口连接。", "Changes apply to the keyboard automatically. Release to the top to run; Save configuration keeps settings after power-off. No companion software or open page or serial connection is needed."],
["。参数修改后自动应用，点击“保存配置”后断电保留；关闭网页不会停止设备输出。", ". Changes apply automatically; Save configuration keeps them after power-off. Closing this page does not stop device output."],
["拖动滑条后自动更新设备灯光；点击“保存配置”后断电保留。步进越大、间隔越小，动画越快。", "Moving sliders automatically updates device lighting; Save configuration keeps settings after power-off. Larger steps and shorter intervals make animation faster."],
["按表单和行程计算的预览，有效修改会自动应用。系统实际音量、滚动距离及应用接收值可能不同。", "Preview based on the form and travel; valid changes apply automatically. Actual system volume, scrolling distance and values received by apps may differ."],
["线性灯效需要 V2.5.0 或更新固件，自动应用后可脱离网页运行，保存后断电保留。", "Travel lighting requires V2.5.0 or newer. It runs without this page after automatic application; saving keeps it after power-off."],
["开源仓库", "Source on GitHub"],
["校准已自动应用。请松开轴体；点击“保存配置”后断电保留。", "Calibration applied automatically. Release the switch; Save configuration keeps it after power-off."],
["已放弃待应用修改或未完成的校准；已自动应用的参数保持不变。", "Discarded pending changes or unfinished calibration. Automatically applied settings are unchanged."],

["线性模式", "Linear mode"],
["串口指令表", "Serial command reference"],
["双击切换反向", "Double-click to reverse"],
["双击反向需要 V2.6.0 或更新固件。", "Double-click reversal requires V2.6.0 or newer firmware."],
["当前光标左键预设不支持双击反向。", "The cursor left-button preset does not support reversal."],
["双击切换方向，再次双击切回；使用上方双击间隔，修改设置或重新上电后回到所选预设方向。双击时仍会输出当前预设动作。", "Double-click to reverse; double-click again to restore. Uses the interval above. Applying settings or restarting restores the selected preset direction. The gesture still produces the current preset output."],
["线性模式以两次有效按下的时间差判定双击，默认 200 ms；双击反向不延迟原有输出。", "Linear mode measures the interval between two valid presses (default 200 ms). Reversal does not delay the original output."],
["线性模式下，有效按下再释放会累计一次；使用触发点、释放点或 RT 判定。设置暂停和 ADC 故障不计数，保存配置后次数断电保留。", "Linear mode counts each valid press followed by release, using actuation/release thresholds or RT. Settings pauses and ADC faults do not count. Save configuration to retain the count across power cycles."],
["旧固件在线性模式下不累计释放次数；升级 V2.6.0 后支持。", "Older firmware does not count releases in linear mode. Upgrade to V2.6.0 to enable counting."],
["当前固件未上报方向", "Direction is not reported by this firmware"],
["当前方向：反向", "Current direction: reversed"],
["当前方向：所选预设", "Current direction: selected preset"],
["面积和压力目前仅支持固定 X / Y 触控位置。当前光标预设只是鼠标左键，不含面积或压力；免伴随程序的 USB 触屏无法读取系统光标位置。", "Area and pressure currently use a fixed X/Y touch location. The cursor preset is a mouse left button without area or pressure. USB touchscreen firmware alone cannot read the system cursor position."],
["从设备引导区读取", "Read from device boot ROM"],
["芯片序列号", "Chip serial number"],
["默认名称使用此序列号", "Used in the default device name"],
["行程亮度", "Travel brightness"],
["反向亮度", "Inverse brightness"],
["行程颜色", "Travel color"],
["颜色亮度联动", "Color and brightness"],
["线性灯效需要 V2.5.0 或更新固件，保存后可脱离网页运行。", "Linear lighting requires V2.5.0 or newer firmware. Save to run without the web app."],
["线性灯效需要 V2.5.0 或更新固件。", "Linear lighting requires V2.5.0 or newer firmware."],
["松开色相", "Released hue"],
["压到底色相", "Bottom-out hue"],
["色相 0–255 沿色环线性变化；交换两端可反转颜色方向。", "Hue varies linearly from 0–255 around the color wheel. Swap endpoints to reverse the direction."],
["未识别", "Unrecognized"],
["固件未提供", "Not reported by firmware"],
["自定义名称最多 12 个字符，支持中文；留空使用 oneKeyHall 加芯片序列号。保存后拔插 USB，USB 产品与串口接口名称生效。", "Custom names support up to 12 characters, including Chinese. Leave blank to use oneKeyHall plus the chip serial number. Save and reconnect USB to update the USB product and serial interface names."],
["连接并完成校准后显示行程灯效预览；未校准或 ADC 异常时灯光关闭。", "Connect and calibrate to preview travel lighting. The LED stays off when uncalibrated or when ADC readings are invalid."],
  [
    "oneKeyHall · 磁轴控制台",
    "oneKeyHall · Hall Keyboard Console"
  ],
  [
    "oneKeyHall · 磁轴固件",
    "oneKeyHall · Hall firmware"
  ],
  [
    "主导航",
    "Main navigation"
  ],
  [
    "连接设备",
    "Connect device"
  ],
  [
    "断开设备",
    "Disconnect"
  ],
  [
    "主题",
    "Theme"
  ],
  [
    "主题 · 自动",
    "Theme · System"
  ],
  [
    "浅色",
    "Light"
  ],
  [
    "深色",
    "Dark"
  ],
  [
    "设备信息",
    "Device information"
  ],
  [
    "未连接设备",
    "Not connected"
  ],
  [
    "固件版本",
    "Firmware version"
  ],
  [
    "累计释放次数",
    "Total releases"
  ],
  [
    "连接时约每 0.5 秒更新 · 保存配置后断电保留",
    "Updates about every 0.5 s while connected · Save to retain after power-off"
  ],
  [
    "设备名称",
    "Device name"
  ],
  [
    "连接后读取名称。",
    "Connect to read the name."
  ],
  [
    "加载配置",
    "Read settings"
  ],
  [
    "放弃修改",
    "Discard changes"
  ],
  [
    "应用，不保存",
    "Apply without saving"
  ],
  [
    "保存配置",
    "Save to device"
  ],
  [
    "参数修改后需要应用或保存。",
    "Apply or save changes to use them on the device."
  ],
  [
    "打开键盘测试",
    "Open keyboard test"
  ],
  [
    "关闭键盘测试",
    "Close keyboard test"
  ],
  [
    "键盘测试",
    "Keyboard test"
  ],
  [
    "测试已关闭",
    "Test off"
  ],
  [
    "测试已开启",
    "Test on"
  ],
  [
    "清空记录",
    "Clear history"
  ],
  [
    "无需连接串口。打开测试后，按键会显示按下、释放提示和当前组合键。",
    "No serial connection required. Enable the test to view key presses, releases and held combinations."
  ],
  [
    "键盘测试区",
    "Keyboard capture area"
  ],
  [
    "点击这里，然后按下键盘",
    "Click here, then press a key"
  ],
  [
    "暂无按住的按键",
    "No keys held"
  ],
  [
    "按下",
    "Pressed"
  ],
  [
    "释放",
    "Released"
  ],
  [
    "次",
    "times"
  ],
  [
    "长按自动重复不重复计数",
    "Auto-repeat does not increase the count"
  ],
  [
    "最近事件",
    "Recent events"
  ],
  [
    "最近键盘事件",
    "Recent keyboard events"
  ],
  [
    "文本输出测试",
    "Text output test"
  ],
  [
    "点击这里，测试键盘的文本或组合键输入。",
    "Click here to test text or keyboard shortcuts."
  ],
  [
    "记录当前页面收到的所有键盘事件，不能区分来自哪一把键盘。系统拦截的组合键（如 Alt+Tab）可能无法完整捕获；切换窗口时会清除按住状态。编辑其他设置时不会拦截输入，Tab 可正常切换焦点。",
    "Records keyboard events received by this page, without identifying the source keyboard. System shortcuts such as Alt+Tab may not be fully captured. Switching windows clears held keys. Other form inputs are unaffected, and Tab still moves focus."
  ],
  [
    "请使用桌面版 Chrome 或 Edge，连接已刷入 oneKeyHall v2 固件的键盘。",
    "Use desktop Chrome or Edge and connect a keyboard running oneKeyHall v2 firmware."
  ],
  [
    "磁轴实时监测",
    "Live Hall sensor monitor"
  ],
  [
    "实时监测",
    "Live sensor data"
  ],
  [
    "实时行程",
    "Live travel"
  ],
  [
    "等待设备",
    "Waiting for device"
  ],
  [
    "校准相对行程",
    "Calibrated relative travel"
  ],
  [
    "触发点",
    "Actuation point"
  ],
  [
    "固定释放点",
    "Fixed release point"
  ],
  [
    "RT 抬起释放线",
    "RT release threshold"
  ],
  [
    "RT 再次按下线",
    "RT repress threshold"
  ],
  [
    "0% 松开 · 100% 压到底",
    "0% released · 100% fully pressed"
  ],
  [
    "紫线首次触发 / 灰线固定释放",
    "Purple: first actuation / Gray: fixed release"
  ],
  [
    "紫线按下触发 / 灰线固定释放",
    "Purple: actuation / Gray: fixed release"
  ],
  [
    "紫线首次触发 · 绿线 RT 抬起 · 橙线 RT 再按",
    "Purple: first actuation · Green: RT release · Orange: RT repress"
  ],
  [
    "RT 抬起",
    "RT release"
  ],
  [
    "RT 再按",
    "RT repress"
  ],
  [
    "完成两点 ADC 校准后显示相对行程。",
    "Relative travel is shown after two-point ADC calibration."
  ],
  [
    "完成两点校准后显示相对行程。",
    "Relative travel is shown after two-point calibration."
  ],
  [
    "原始 ADC",
    "Raw ADC"
  ],
  [
    "8 位 · 0–255",
    "8-bit · 0–255"
  ],
  [
    "滤波 ADC",
    "Filtered ADC"
  ],
  [
    "设备实时采样",
    "Live device samples"
  ],
  [
    "有效校准跨度",
    "Effective calibration span"
  ],
  [
    "至少 16 个计数",
    "At least 16 counts"
  ],
  [
    "磁轴校准",
    "Hall sensor calibration"
  ],
  [
    "未读取",
    "Not read"
  ],
  [
    "进入校准会暂停键盘输出。每次采样时保持轴体静止；完成后点击“保存配置”或“应用，不保存”。",
    "Calibration pauses keyboard output. Hold the switch still during each capture, then choose Save to device or Apply without saving."
  ],
  [
    "开始校准 / 暂停输出",
    "Start calibration / Pause output"
  ],
  [
    "① 松开轴体，采集顶部",
    "① Release switch, capture rest"
  ],
  [
    "② 压住到底，采集底部",
    "② Press fully, capture bottom"
  ],
  [
    "有效跨度",
    "Effective span"
  ],
  [
    "完成顶部和底部采集后显示；最低要求 16 个 ADC 计数。",
    "Shown after both endpoints are captured. At least 16 ADC counts are required."
  ],
  [
    "顶部 ADC — / 底部 ADC —",
    "Rest ADC — / Bottom ADC —"
  ],
  [
    "触发手感",
    "Actuation settings"
  ],
  [
    "按下触发点",
    "Actuation point"
  ],
  [
    "顶部死区",
    "Top dead zone"
  ],
  [
    "滤波强度",
    "Filter strength"
  ],
  [
    "关闭 · 响应最快",
    "Off · Fastest response"
  ],
  [
    "轻度",
    "Light"
  ],
  [
    "标准",
    "Standard"
  ],
  [
    "平滑",
    "Smooth"
  ],
  [
    "状态确认采样数",
    "Confirmation samples"
  ],
  [
    "释放点必须低于触发点。上电、校准或修改设置后，需先松回顶部死区才会启用按键。",
    "The release point must be below the actuation point. After power-on, calibration or settings changes, release into the top dead zone to enable output."
  ],
  [
    "快速触发 RT",
    "Rapid Trigger (RT)"
  ],
  [
    "启用",
    "Enable"
  ],
  [
    "首次越过触发点后，抬起指定距离即释放，再向下移动指定距离即可重新触发。",
    "After the first actuation, moving up by the release distance releases the key; moving down by the repress distance triggers it again."
  ],
  [
    "重新按下距离",
    "Repress distance"
  ],
  [
    "抬起释放距离",
    "Release distance"
  ],
  [
    "固件会把 RT 距离限制为至少 2 个 ADC 计数，以减少噪声误触发。",
    "Firmware enforces a minimum RT distance of 2 ADC counts to reduce noise-triggered events."
  ],
  [
    "RT 使用顶部死区复位，不使用固定释放点；不能与双击模式同时启用。",
    "RT resets in the top dead zone and does not use the fixed release point. It cannot be combined with double-click mode."
  ],
  [
    "按键映射",
    "Key mapping"
  ],
  [
    "工作模式",
    "Operating mode"
  ],
  [
    "直接使用 KEY1",
    "Use KEY1"
  ],
  [
    "直接使用 KEY2",
    "Use KEY2"
  ],
  [
    "单击 KEY1 / 双击 KEY2",
    "Single click KEY1 / Double click KEY2"
  ],
  [
    "线性模式 · 设备独立运行",
    "Linear mode · Standalone device"
  ],
  [
    "双击间隔",
    "Double-click interval"
  ],
  [
    "设备线性控制",
    "Device linear control"
  ],
  [
    "参数直接写入键盘。应用后松回顶部即可运行，保存后断电保留；无需安装伴随程序，也无需保持网页或串口连接。",
    "Settings are written directly to the keyboard. Apply, then release to rest to enable output; save to retain settings after power-off. No companion app, open page or serial connection is required."
  ],
  [
    "预设",
    "Preset"
  ],
  [
    "音量 · 松开最低，压到底最高",
    "Volume · Released: min, fully pressed: max"
  ],
  [
    "音量反向 · 松开最高，压到底最低",
    "Reverse volume · Released: max, fully pressed: min"
  ],
  [
    "滚轮向上 · 松开停止，越深越快",
    "Scroll up · Released: stop, deeper: faster"
  ],
  [
    "滚轮向下 · 松开停止，越深越快",
    "Scroll down · Released: stop, deeper: faster"
  ],
  [
    "当前光标 · 按住鼠标左键",
    "Current cursor · Hold left mouse button"
  ],
  [
    "固定位置触控 · 接触面积越深越大",
    "Fixed touch · Deeper: larger contact area"
  ],
  [
    "固定位置触控 · 压力越深越强",
    "Fixed touch · Deeper: higher pressure"
  ],
  [
    "固定位置触控 · 面积与压力联动",
    "Fixed touch · Area and pressure together"
  ],
  [
    "使用上方磁轴设置的顶部死区。当前光标点击使用触发点、释放点和 RT；其余预设按死区外的连续行程计算。",
    "Uses the top dead zone from the Hall settings above. Current-cursor clicks use actuation, release and RT thresholds; other presets use continuous travel outside the dead zone."
  ],
  [
    "最低音量（%）",
    "Minimum volume (%)"
  ],
  [
    "最高音量（%）",
    "Maximum volume (%)"
  ],
  [
    "0 → 100% 的音量步数",
    "Volume steps from 0 to 100%"
  ],
  [
    "通过 USB 媒体音量键近似映射，无法读取系统实际百分比。启用后先连续降低音量约 2 秒归零，再追随行程；默认按每次 2%（50 步）估算。用系统滑块或其他键盘调音量后，可重新同步。反向预设松开时会调到最高设定音量。",
    "Uses USB media keys for an approximate mapping; it cannot read the actual system volume. On activation, it lowers volume for about 2 seconds to reach zero, then follows travel. The default estimate is 2% per key press (50 steps). Resynchronize after changing volume elsewhere. Reverse mode goes to the configured maximum when released."
  ],
  [
    "压到底的滚轮速度（格/秒）",
    "Full-travel wheel rate (detents/s)"
  ],
  [
    "鼠标原本在哪，就在那里按下左键；松开磁轴后释放。设备不移动光标，不读取屏幕宽高。这是普通鼠标按住，可拖动，没有触摸面积或压力。",
    "Presses the left mouse button at the current cursor location and releases it when the switch is released. The device does not move the cursor or read screen dimensions. This is a normal mouse hold, allowing dragging, without touch area or pressure."
  ],
  [
    "固定位置 X（屏幕宽度 %）",
    "Fixed X (% of screen width)"
  ],
  [
    "固定位置 Y（屏幕高度 %）",
    "Fixed Y (% of screen height)"
  ],
  [
    "最小接触面积（屏幕面积 %）",
    "Minimum contact area (% of screen)"
  ],
  [
    "最大接触面积（屏幕面积 %）",
    "Maximum contact area (% of screen)"
  ],
  [
    "最小压力（0–255）",
    "Minimum pressure (0–255)"
  ],
  [
    "最大压力（0–255）",
    "Maximum pressure (0–255)"
  ],
  [
    "USB 单点触屏输入：从死区外开始接触，回到顶部抬起，按住期间更新面积和压力。仅压力预设使用最小面积；仅面积预设使用最大压力。X / Y 以系统为此触屏映射的显示器为准，多屏可在系统触控设置中调整。接触宽高按各自屏幕轴比例计算，面积为量化近似值；应用可能忽略面积或压力。这不是实际牛顿力，也不是触控笔。",
    "USB single-touch input: contact starts outside the dead zone, updates while held, and lifts at rest. Pressure-only mode uses the minimum area; area-only mode uses maximum pressure. X/Y refer to the display mapped to this touchscreen by the OS; adjust multi-display mapping in system touch settings. Contact dimensions scale along each screen axis, so area is quantized and approximate. Apps may ignore area or pressure. This is neither measured force in newtons nor pen input."
  ],
  [
    "等待行程",
    "Waiting for travel"
  ],
  [
    "重新同步音量",
    "Resynchronize volume"
  ],
  [
    "打开触控接收测试页",
    "Open touch input test"
  ],
  [
    "。使用页面底部的“应用”或“保存配置”使参数生效；关闭网页不会停止设备输出。",
    ". Use Apply or Save to device to activate the settings. Closing the page does not stop device output."
  ],
  [
    "RGB 灯效",
    "RGB lighting"
  ],
  [
    "灯效模式",
    "Lighting mode"
  ],
  [
    "固定模式",
    "Solid color"
  ],
  [
    "呼吸模式",
    "Breathing"
  ],
  [
    "HUE 渐变模式",
    "Hue cycle"
  ],
  [
    "选择颜色",
    "Choose color"
  ],
  [
    "亮度",
    "Brightness"
  ],
  [
    "步进",
    "Step"
  ],
  [
    "间隔",
    "Interval"
  ],
  [
    "拖动滑条预览参数，点击“应用，不保存”或“保存配置”后更新设备灯光。步进越大、间隔越小，动画越快。",
    "Move the sliders to preview settings, then apply or save to update the device LED. Larger steps and shorter intervals make the animation faster."
  ],
  [
    "固件更新",
    "Firmware update"
  ],
  [
    "获取最新固件",
    "Get the latest firmware"
  ],
  [
    "下载本网站发布的最新 HEX 文件，再用烧录工具更新设备。无需连接键盘。",
    "Download the latest HEX published here, then use a flashing tool to update the device. No keyboard connection is required to download."
  ],
  [
    "下载最新固件（HEX）",
    "Download latest firmware (HEX)"
  ],
  [
    "此按钮只下载文件，不会让键盘进入 ISP 或执行烧录。",
    "This button only downloads a file. It does not enter ISP mode or flash the keyboard."
  ],
  [
    "进入设备下载模式",
    "Enter device ISP mode"
  ],
  [
    "进入下载模式后，请使用 CH54x-55x 烧录工具更新固件。进入前请先保存需要保留的设备配置。",
    "After entering ISP mode, use the CH54x-55x flashing tool to update firmware. Save any device settings you want to keep before continuing."
  ],
  [
    "进入下载模式",
    "Enter ISP mode"
  ],
  [
    "连接后检查固件支持情况。",
    "Connect to check firmware support."
  ],
  [
    "最近下载请求（刷新后清空）",
    "Recent ISP requests (cleared on refresh)"
  ],
  [
    "此操作会关闭 LED 并断开当前串口连接，不会自动烧录固件。按钮仅在设备已连接且固件支持时启用。",
    "This turns off the LED and disconnects the current serial connection. It does not flash firmware automatically. The button is enabled only when a supported device is connected."
  ],
  [
    "这里是键盘的控制面板。保留原版键盘测试、按键映射和灯光设置，并增加磁轴校准、快速触发及固件下载入口。",
    "Keyboard control panel with keyboard testing, key mapping and lighting, plus Hall calibration, Rapid Trigger and firmware downloads."
  ],
  [
    "相对行程由两点 ADC 校准估算，磁场随实际位移可能非线性，不能视为毫米测量。",
    "Relative travel is estimated from two ADC calibration points. Magnetic response may be nonlinear with physical movement; this is not a measurement in millimeters."
  ],
  [
    "页面只连接你主动选择的串口；未连接时不显示模拟设备数据。",
    "The page only connects to a serial port you select. It does not show simulated device data while disconnected."
  ],
  [
    "输出方式",
    "Output type"
  ],
  [
    "单键 · 按住保持",
    "Single key · Hold"
  ],
  [
    "组合键 · 按下后立即释放",
    "Chord · Press and release"
  ],
  [
    "组合键 · 按住保持",
    "Chord · Hold"
  ],
  [
    "输入文本（最多 30 字节 ASCII）",
    "Type text (up to 30 ASCII bytes)"
  ],
  [
    "文本",
    "Text"
  ],
  [
    "仅支持 ASCII 字符",
    "ASCII characters only"
  ],
  [
    "主键 / 组合键 1",
    "Main key / Chord key 1"
  ],
  [
    "无 / 结束",
    "None / End"
  ],
  [
    "Space 空格",
    "Space"
  ],
  [
    "左 Ctrl",
    "Left Ctrl"
  ],
  [
    "左 Shift",
    "Left Shift"
  ],
  [
    "左 Alt",
    "Left Alt"
  ],
  [
    "左 Win / Cmd",
    "Left Win / Cmd"
  ],
  [
    "右 Ctrl",
    "Right Ctrl"
  ],
  [
    "右 Shift",
    "Right Shift"
  ],
  [
    "右 Alt",
    "Right Alt"
  ],
  [
    "右 Win / Cmd",
    "Right Win / Cmd"
  ],
  [
    "尚无下载请求记录。记录仅在当前页面保留，刷新后清空；时间采用 UTC（北京时间 +8 小时）。",
    "No ISP requests yet. History stays in this page and clears on refresh. Timestamps use UTC (China Standard Time is UTC+8)."
  ],
  [
    "从第一次按下到第二次按下，小于此间隔视为双击；达到间隔后才输出单击。默认 200 ms，步长 10 ms。RT 与双击互斥。",
    "A second press before this interval expires counts as a double click. Single-click output waits until the interval expires. Default: 200 ms, step: 10 ms. RT and double-click mode are mutually exclusive."
  ],
  [
    "当前固件固定为 200 ms；升级 V2.3.0 后可修改。",
    "This firmware uses a fixed 200 ms interval. Upgrade to V2.3.0 or later to edit it."
  ],
  [
    "设备独立运行需要 V2.4.0 或更新固件。",
    "Standalone linear control requires firmware V2.4.0 or later."
  ],
  [
    "选择预设后点击“应用，不保存”或“保存配置”，让设备进入线性模式。",
    "Choose a preset, then apply or save to put the device in linear mode."
  ],
  [
    "设备已进入线性模式，关闭网页后仍会运行。切换到 KEY1 / KEY2 并应用可退出。",
    "The device is in linear mode and keeps running when this page closes. Select KEY1 or KEY2 and apply to exit."
  ],
  [
    "最多 12 个字符，支持中文；留空恢复 oneKeyHall。保存配置后拔插 USB，USB 产品与串口接口名称生效；系统部分列表可能仍显示驱动通用名称。",
    "Up to 12 characters, including Chinese. Leave blank for oneKeyHall. Save and reconnect USB to update product and serial interface names; some OS lists may still show a generic driver name."
  ],
  [
    "当前固件不支持改名，请升级 V2.3.0。",
    "Renaming requires firmware V2.3.0 or later."
  ],
  [
    "连接后检查固件是否支持下载模式。",
    "Connect to check ISP mode support."
  ],
  [
    "正在读取固件能力…",
    "Reading firmware capabilities…"
  ],
  [
    "设置中：键盘输出已暂停。离开或断线将放弃未应用的设置。",
    "Settings session: keyboard output is paused. Leaving or disconnecting discards unapplied changes."
  ],
  [
    "已校准",
    "Calibrated"
  ],
  [
    "尚未校准",
    "Not calibrated"
  ],
  [
    "请填写有效的 RT 距离和顶部死区。",
    "Enter valid RT distances and a top dead zone."
  ],
  [
    "连接并完成校准后显示 RT 参数线。",
    "Connect and calibrate to display RT thresholds."
  ],
  [
    "参数预览：应用或保存后生效。",
    "Settings preview: apply or save to activate."
  ],
  [
    "当前固件未上报 RT 极值，显示以当前行程为基准的距离参考线；更新固件可查看实时阈值。",
    "This firmware does not report RT extrema. Lines show distances from current travel; update firmware for live thresholds."
  ],
  [
    "等待首次触发或设备恢复输出；两条线暂为距离参考。",
    "Waiting for first actuation or output to resume. Both lines are distance references for now."
  ],
  [
    "请填写全部数值，并检查数值范围。",
    "Fill in all numeric fields and check their ranges."
  ],
  [
    "设备未连接，显示数据已清除。",
    "Device disconnected; displayed readings cleared."
  ],
  [
    "已断开连接。设备会放弃未应用的设置。",
    "Disconnected. The device discards unapplied settings."
  ],
  [
    "请先校准，再查看 RT 的有效分辨率。",
    "Calibrate first to see effective RT resolution."
  ],
  [
    "ADC 异常",
    "ADC fault"
  ],
  [
    "设置中 · 输出暂停",
    "Settings · Output paused"
  ],
  [
    "已按下",
    "Pressed"
  ],
  [
    "已释放",
    "Released"
  ],
  [
    "ADC 接近 0 或 255，按键已释放。请检查信号。",
    "ADC is near 0 or 255. Input has been released; check the signal."
  ],
  [
    "完成两点校准后才能启用磁轴。",
    "Complete two-point calibration to enable the Hall switch."
  ],
  [
    "完成设置后应用或保存，然后松开轴体。",
    "Apply or save your settings, then release the switch."
  ],
  [
    "已就绪 · 按键输出启用",
    "Ready · Output enabled"
  ],
  [
    "请先完全松开轴体，等待进入顶部死区。",
    "Fully release the switch and wait until it reaches the top dead zone."
  ],
  [
    "设备设置会话已结束，未应用修改已回退，请重新读取。",
    "The settings session ended and unapplied changes were rolled back. Read settings again."
  ],
  [
    "Web Serial 不可用。请使用桌面 Chrome / Edge，通过 HTTPS 或本地 http://127.0.0.1:5173 访问。",
    "Web Serial is unavailable. Use desktop Chrome or Edge over HTTPS or at http://127.0.0.1:5173."
  ],
  [
    "未上报",
    "Not reported"
  ],
  [
    "连接成功。可查看实时数据，或调整触发手感。",
    "Connected. View live readings or adjust actuation settings."
  ],
  [
    "连接成功。请先开始校准：采集松开和压到底两个端点。",
    "Connected. Start calibration and capture the released and fully pressed endpoints."
  ],
  [
    "键盘输出已暂停。请完全松开轴体，然后采集顶部。",
    "Keyboard output paused. Fully release the switch, then capture rest."
  ],
  [
    "顶部采集成功。请压住轴体到底，保持不动，再采集底部。",
    "Rest captured. Press fully, hold still, then capture bottom."
  ],
  [
    "校准完成 · 待应用",
    "Calibration captured · Not applied"
  ],
  [
    "两点校准成功。松开轴体，调整参数后应用或保存到设备。",
    "Both endpoints captured. Release the switch, adjust settings, then apply or save."
  ],
  [
    "设备回读与请求不一致，请重新读取配置。",
    "Read-back differs from the requested settings. Read configuration again."
  ],
  [
    "已保存到设备，断电后保留。请完全松开轴体以启用按键。",
    "Saved to device and retained after power-off. Fully release the switch to enable output."
  ],
  [
    "已应用到运行内存，断电后恢复已保存配置。请完全松开轴体。",
    "Applied to RAM. Saved settings return after power-off. Fully release the switch."
  ],
  [
    "已保存到设备，断电后保留。",
    "Saved to device and retained after power-off."
  ],
  [
    "请完全松开轴体以启用按键。",
    "Fully release the switch to enable output."
  ],
  [
    "已应用到运行内存，断电后恢复已保存配置。",
    "Applied to RAM. Saved settings return after power-off."
  ],
  [
    "请完全松开轴体。",
    "Fully release the switch."
  ],
  [
    "若修改了名称，请拔插 USB 以更新 USB 名称。",
    "If you changed the name, reconnect USB to update its USB name."
  ],
  [
    "USB 名称需保存配置后拔插才能生效。",
    "USB name changes require saving and reconnecting USB."
  ],
  [
    "请先应用音量预设。",
    "Apply a volume preset first."
  ],
  [
    "请松开轴体，设备将先发送约 2 秒音量降低，再按行程估算音量。",
    "Release the switch. The device will send volume-down presses for about 2 seconds, then estimate volume from travel."
  ],
  [
    "已放弃本次未应用的设置。请松开轴体。",
    "Unapplied changes discarded. Release the switch."
  ],
  [
    "已读取当前设置会话中的参数。尚未应用或保存。",
    "Read the current settings draft. It has not been applied or saved."
  ],
  [
    "已读取设备当前运行配置。",
    "Read the device's active settings."
  ],
  [
    "当前设备未连接或固件不支持软件进入下载模式。",
    "The device is not connected or its firmware does not support software ISP entry."
  ],
  [
    "已取消，没有发送下载命令。",
    "Canceled. No ISP command was sent."
  ],
  [
    "已收到固件成功应答 [1000,99,0]，正在关闭应用串口；尚未确认 ISP 枚举。",
    "Received firmware success ACK [1000,99,0]. Closing the application serial port; ISP enumeration is not yet confirmed."
  ],
  [
    "应用串口已关闭。此按钮不会自动打开烧录工具或烧录；请在 CH54x-55x 烧录工具中确认 ISP 设备。部分 BootLoader 会超时返回应用。",
    "Application serial port closed. This button does not launch a flashing tool or flash firmware. Check for the ISP device in the CH54x-55x flashing tool. Some bootloaders time out and return to the application."
  ],
  [
    "当前浏览器不支持 Web Serial 或页面不在安全环境中。请使用桌面 Chrome / Edge，通过 HTTPS 或本地 HTTP 地址打开。",
    "Web Serial is unavailable or this page is not in a secure context. Use desktop Chrome or Edge over HTTPS or a local HTTP address."
  ],
  [
    "连接设备后预览行程",
    "Connect to preview travel"
  ],
  [
    "鼠标左键 · 按住",
    "Left mouse button · Held"
  ],
  [
    "鼠标左键 · 松开",
    "Left mouse button · Released"
  ],
  [
    "按表单和行程计算的预览，修改后请应用或保存。系统实际音量、滚动距离及应用接收值可能不同。",
    "Preview calculated from the form and travel. Apply or save changes. Actual volume, scroll distance and app input may differ."
  ],
  [
    "窗口失焦，已清除按住状态",
    "Window lost focus; held keys cleared"
  ],
  [
    "开启测试后，按下键盘查看记录。",
    "Enable the test, then press keys to see events."
  ],
  [
    "操作顺序不正确，请重新进入设置。",
    "Invalid operation order. Start a new settings session."
  ],
  [
    "参数组合无效，请检查触发点、释放点和 RT 模式。",
    "Invalid settings combination. Check actuation, release and RT mode."
  ],
  [
    "采样不稳定或 ADC 接近电源轨，请保持轴体静止并检查接线。",
    "Samples are unstable or ADC is near a supply rail. Hold the switch still and check wiring."
  ],
  [
    "两点差值不足 16 个 ADC 计数，请检查磁铁方向、位置或传感器。",
    "Endpoint span is below 16 ADC counts. Check magnet direction, position and the sensor."
  ],
  [
    "设备存储回读校验失败，本次保存未确认。请重新连接并检查。",
    "Storage read-back failed; this save is unconfirmed. Reconnect and check."
  ],
  [
    "需要 oneKeyHall 磁轴固件；此页面不能配置旧版机械轴固件。",
    "Requires oneKeyHall Hall firmware. This page cannot configure the original mechanical-switch firmware."
  ],
  [
    "双击间隔或设备名称长度无效。",
    "Invalid double-click interval or device name length."
  ],
  [
    "设备名称字符无效。",
    "Invalid character in device name."
  ],
  [
    "设备线性参数超出范围。",
    "Device linear parameters are outside their allowed ranges."
  ],
  [
    "按键或灯效模式无效。",
    "Invalid key or lighting mode."
  ],
  [
    "需要：顶部死区 ≤ 释放点 < 触发点，触发点为 5–95%。",
    "Required: top dead zone ≤ release point < actuation point; actuation must be 5–95%."
  ],
  [
    "RT 距离、滤波或确认采样数超出范围。",
    "RT distance, filter strength or confirmation sample count is out of range."
  ],
  [
    "快速触发不能和双击模式同时开启，请选择直接使用 KEY1 或 KEY2。",
    "RT cannot be combined with double-click mode. Select KEY1 or KEY2 directly."
  ],
  [
    "校准数据无效，请重新校准。",
    "Invalid calibration data. Calibrate again."
  ],
  [
    "设备已断开。",
    "Device disconnected."
  ],
  [
    "串口已关闭。",
    "Serial port closed."
  ],
  [
    "设备响应超时，请重新连接；未确认的设置不视为成功。",
    "Device response timed out. Reconnect; unconfirmed settings are not considered successful."
  ],
  [
    "设备拒绝了写入。",
    "The device rejected the write."
  ],
  [
    "设备拒绝了命令。",
    "The device rejected the command."
  ],
  [
    "设备未返回有效的固件版本。",
    "The device did not return a valid firmware version."
  ],
  [
    "设备拒绝进入下载模式，请确认固件是否支持此功能。",
    "The device rejected ISP entry. Check whether the firmware supports this feature."
  ],
  [
    "设备名称最多 12 个字符，支持中文、英文和数字，不支持表情或控制字符；留空恢复默认名称。",
    "Device names support up to 12 characters, including Chinese, Latin letters and digits, but not emoji or control characters. Leave blank for the default name."
  ],
  [
    "双击间隔为 50–1000 ms，步长 10 ms。",
    "Double-click interval must be 50–1000 ms in 10 ms steps."
  ],
  [
    "oneKeyHall 触控接收测试",
    "oneKeyHall Touch Input Test"
  ],
  [
    "触控接收测试",
    "Touch input test"
  ],
  [
    "此页只显示浏览器实际收到的 PointerEvent，不产生输入。将设备的固定触控坐标设在下方区域内并保存，再按下磁轴；无需保持配置页打开。当前光标点击预设只会产生 mouse 事件。若显示 mouse，或压力/面积不变，说明当前输入路径或浏览器未传递对应触控信息。",
    "This page only displays received PointerEvents; it does not generate input. Set and save a fixed device touch position inside the area below, then press the switch. The configuration page can be closed. Current-cursor clicks produce mouse events only. If touch mode shows mouse, or pressure/area stays constant, the input path or browser may not be forwarding those touch fields."
  ],
  [
    "触摸测试区",
    "Touch test area"
  ],
  [
    "等待输入",
    "Waiting for input"
  ],
  [
    "Web PointerEvent 的 width/height 为 CSS 像素、pressure 为 0–1，可能经过浏览器或系统处理，不等于原始 Windows 触控结构。",
    "PointerEvent width/height use CSS pixels and pressure uses 0–1. These may be transformed by the browser or OS and are not raw Windows touch values."
  ],
  [
    "进入下载模式将关闭 LED 并断开当前连接，未保存的设备配置会丢失。\n\n请先保存需要保留的配置，并准备好烧录工具。是否继续？",
    "Entering ISP mode turns off the LED and disconnects the current connection. Unsaved device settings will be lost.\n\nSave any settings you want to keep and have your flashing tool ready. Continue?"
  ]
]);
