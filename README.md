# 🎛️ DasMikro TBS Mini Programmer

A **beginner-friendly, single-page web app** for programming and controlling the **DasMikro TBS Mini Programmable Sound & Light Control Unit** via USB serial connection — right from your web browser. No software to install!

🌐 **Live App:** https://jt032555-cpu.github.io/dasmikro-tbs-programmer

---

## 📦 What Is the DasMikro TBS Mini?

The **DasMikro TBS Mini** is a small electronic module for RC (radio-controlled) vehicles — tanks, trucks, boats, planes. It:

- Plays realistic engine, gun, horn, and other **sound effects** through a small speaker
- Controls up to **6 switching outputs** for lights (headlights, turn signals, muzzle flash, beacon, etc.)
- Reads throttle and auxiliary channels from your **RC receiver**
- Can be **programmed via USB** using a serial connection

---

## 🛒 What You Need (Hardware)

| Item | Notes |
|------|-------|
| DasMikro TBS Mini | The sound/light controller board |
| USB-to-Serial adapter | CP2102 or FTDI FT232 (~$3–$8 on Amazon). Get either a 3.3V or 5V variant |
| 8Ω speaker (1–3W) | Small speaker that fits in your vehicle body |
| LEDs (optional) | For lights. Use 3mm or 5mm LEDs |
| 220–470Ω resistors | **Required** with each LED — prevents burning them out |
| RC receiver | Standard PWM RC receiver (connects via PROP1/PROP2/PROP3) |
| Battery / BEC | 5V–9V regulated power (do NOT exceed 9V!) |
| Dupont jumper wires | For making connections on the bench |

---

## 🔌 How to Wire Everything Up

> See the **interactive pin diagram** in the app's Wiring tab for a visual guide!

### Basic Wiring (Receiver → TBS Mini → ESC + Speaker)

```
RC RECEIVER            TBS MINI               ESC / Motor
┌──────────┐           ┌──────────────┐       ┌──────────┐
│ CH1 (THR)├──────────▶│ PROP1        │       │          │
│ CH2 (AUX)├──────────▶│ PROP2        │       │          │
│ CH3 (AUX)├──────────▶│ PROP3        ├──────▶│ SERVO OUT│
└──────────┘           │              │       └──────────┘
                       │ VCC (+)◀─────┤ Battery/BEC +5V–9V
SPEAKER (8Ω)           │ GND (–)◀─────┤ Battery/BEC GND
┌──────────┐           │              │
│   (+)    │◀──SPK+────┤              │
│   (–)    │◀──SPK─────┤              │
└──────────┘           └──────────────┘
```

### Adding Lights (OUT1–OUT6)

```
Battery (+) ──── LED ──── 330Ω resistor ──── OUT1 (switches to GND inside the TBS)
```

| Output | Default Use      |
|--------|-----------------|
| OUT1   | Headlights       |
| OUT2   | Tail lights      |
| OUT3   | Left turn signal |
| OUT4   | Right turn signal|
| OUT5   | Muzzle flash     |
| OUT6   | Beacon / rotating light |

### Programming Connection (USB-to-Serial)

```
USB-to-Serial Adapter      TBS Mini
TX  ──────────────────────▶ RX
RX  ◀────────────────────── TX
GND ────────────────────── GND
5V  ────────────────────── VCC  ← only if not separately powered
```

> ⚠️ **TX crosses to RX** — a very common mistake for beginners!

---

## 🌐 How to Use the Web App

### Step 1: Open the App
Go to: **https://jt032555-cpu.github.io/dasmikro-tbs-programmer**

Use **Google Chrome** or **Microsoft Edge** (version 89 or newer). Firefox and Safari are NOT supported (they don't have the Web Serial API).

### Step 2: Connect Your USB Adapter
1. Plug your USB-to-Serial adapter into your computer
2. Connect the adapter to your TBS Mini (TX→RX, RX→TX, GND→GND)
3. Power the TBS Mini (from BEC or battery)

### Step 3: Click "Connect USB"
1. Click the big green **"🔌 Connect USB"** button
2. A popup will appear — select your USB adapter (usually shows as "CP2102" or "USB-SERIAL")
3. The status dot turns **green** when connected ✅

### Step 4: Control Your TBS Mini
Use the buttons to:
- **Start/Stop** the engine sound
- Trigger **horn**, **machine gun**, **sound slots**
- Adjust **volume** and switch **sound banks**
- Toggle **lights** (headlights, turns, muzzle flash, beacon)
- Use **Hazard mode** to flash both turn signals

### Step 5 (Optional): Settings
Go to the **Settings** tab to adjust:
- Idle & max RPM
- Throttle curve
- Channel calibration
- Output modes (switching / momentary / flashing)
- Servo limits

### Step 6 (Optional): Add to Home Screen (Phone)
On Android with Chrome: tap the **⋮ menu → "Add to Home Screen"** — the app works like a native app!

---

## 🖥️ Browser Requirements

| Browser | Supported? | Notes |
|---------|-----------|-------|
| Google Chrome 89+ | ✅ Yes | Recommended |
| Microsoft Edge 89+ | ✅ Yes | Works great |
| Firefox | ❌ No | No Web Serial API |
| Safari (iOS/Mac) | ❌ No | No Web Serial API |
| Chrome on Android | ✅ Yes | Works with OTG adapter |

---

## 🔧 Troubleshooting

### "No port selected" or nothing happens when I click Connect
- Make sure your USB-to-Serial adapter is plugged in **before** clicking Connect
- Try a different USB cable (some cables are charge-only, not data!)
- Install the driver for your adapter: [CP2102 driver](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) or [FTDI driver](https://ftdichip.com/drivers/vcp-drivers/)

### Device connects but no sound
- Check that VCC and GND are powered
- Check speaker wires (SPK+ and SPK–)
- Try pressing Engine Start

### Lights don't work
- Make sure you have a **resistor** in series with each LED (220–470Ω)
- Check the polarity: OUT1–OUT6 are **low-side switches** (they connect to GND when ON)

### TX/RX mixed up?
- If data is sent but nothing works, try **swapping TX and RX** — they often cross over

### "Permission denied" error
- Close Arduino IDE or any other serial monitor that might be using the port
- Try unplugging and replugging the USB adapter

---

## 📁 File Structure

```
/
├── index.html     Main application page
├── style.css      Dark theme styling
├── app.js         Application logic (Web Serial API)
├── manifest.json  PWA manifest for "Add to Home Screen"
├── sw.js          Service worker for offline caching
└── README.md      This file
```

---

## 📜 License

MIT License — free to use, modify, and share.

---

*Made with ❤️ for the RC community. Not affiliated with DasMikro.*
