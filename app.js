/**
 * DasMikro TBS Mini Programmer — app.js
 * Web Serial API controller for the DasMikro TBS Mini Sound & Light Unit
 * Works in Chrome 89+ / Edge 89+ (Web Serial API required)
 *
 * Serial protocol: 9600 baud, 8N1, single-byte hex commands
 */

'use strict';

/* ============================================================
   COMMAND REFERENCE TABLE
   All single-byte hex commands for the TBS Mini
============================================================ */
const CMD_MAP = [
  { hex: 0x01, name: 'Engine Start' },
  { hex: 0x02, name: 'Engine Stop' },
  { hex: 0x11, name: 'Sound Slot 1' },
  { hex: 0x12, name: 'Sound Slot 2' },
  { hex: 0x13, name: 'Sound Slot 3' },
  { hex: 0x14, name: 'Sound Slot 4' },
  { hex: 0x15, name: 'Sound Slot 5' },
  { hex: 0x16, name: 'Sound Slot 6' },
  { hex: 0x17, name: 'Sound Slot 7' },
  { hex: 0x18, name: 'Sound Slot 8' },
  { hex: 0x21, name: 'Horn (hold)' },
  { hex: 0x22, name: 'Horn Stop' },
  { hex: 0x23, name: 'Machine Gun (hold)' },
  { hex: 0x24, name: 'Machine Gun Stop' },
  { hex: 0x31, name: 'Next Sound Bank' },
  { hex: 0x32, name: 'Previous Sound Bank' },
  { hex: 0x41, name: 'Volume Up' },
  { hex: 0x42, name: 'Volume Down' },
  { hex: 0x51, name: 'OUT1 On (Headlights)' },
  { hex: 0x52, name: 'OUT1 Off' },
  { hex: 0x53, name: 'OUT2 On (Tail Lights)' },
  { hex: 0x54, name: 'OUT2 Off' },
  { hex: 0x55, name: 'OUT3 On (Left Turn)' },
  { hex: 0x56, name: 'OUT3 Off' },
  { hex: 0x57, name: 'OUT4 On (Right Turn)' },
  { hex: 0x58, name: 'OUT4 Off' },
  { hex: 0x59, name: 'OUT5 On (Muzzle/Aux)' },
  { hex: 0x5A, name: 'OUT5 Off' },
  { hex: 0x5B, name: 'OUT6 On (Beacon/Aux)' },
  { hex: 0x5C, name: 'OUT6 Off' },
];

/* ============================================================
   PIN TOOLTIP DATA
============================================================ */
const PIN_DATA = {
  VCC: {
    title: 'VCC — Power Input',
    connect: '5V–9V from BEC or battery pack',
    wire: 'Red = positive (+)',
    tip: '⚠️ Do not exceed 9V or you will damage the board!',
  },
  GND: {
    title: 'GND — Ground',
    connect: 'Negative of battery / BEC',
    wire: 'Black or Brown = ground (–)',
    tip: 'Connect GND to ALL devices (ESC, receiver, etc.) for a common ground.',
  },
  TX: {
    title: 'TX — Serial Transmit',
    connect: 'Connect to RX on your USB-to-Serial adapter',
    wire: 'Any color — label it so you don\'t mix it up',
    tip: '⚠️ TX goes to RX! They CROSS over. A common beginner mistake.',
  },
  RX: {
    title: 'RX — Serial Receive',
    connect: 'Connect to TX on your USB-to-Serial adapter',
    wire: 'Any color — label it so you don\'t mix it up',
    tip: '⚠️ RX goes to TX! They CROSS over.',
  },
  'SPK+': {
    title: 'SPK+ — Speaker Positive',
    connect: '+ terminal of an 8Ω speaker (1–3W recommended)',
    wire: 'Usually red on speaker wire',
    tip: 'Use a speaker rated 8Ω / 1–3W. A larger speaker sounds better in a vehicle body.',
  },
  'SPK-': {
    title: 'SPK– — Speaker Negative',
    connect: '– terminal of an 8Ω speaker (1–3W recommended)',
    wire: 'Usually black on speaker wire',
    tip: 'Polarity matters! Wrong polarity reduces bass.',
  },
  PROP1: {
    title: 'PROP1 — Throttle / Main Input',
    connect: 'CH1 or CH2 on your RC receiver (throttle channel)',
    wire: 'White = signal, Red = +5V, Black = GND (standard servo plug)',
    tip: 'This controls engine sound RPM. Connect the throttle channel from your receiver.',
  },
  PROP2: {
    title: 'PROP2 — Aux Input',
    connect: 'Auxiliary channel on your RC receiver (horn, lights, etc.)',
    wire: 'White = signal, Red = +5V, Black = GND',
    tip: 'Assign this channel on your transmitter to a switch for horn or extra sounds.',
  },
  PROP3: {
    title: 'PROP3 — Aux Input / Sound Bank',
    connect: 'Auxiliary channel or rotary encoder for sound bank selection',
    wire: 'White = signal, Red = +5V, Black = GND',
    tip: 'Use a rotary knob on your transmitter to flip between sound banks.',
  },
  SERVO1: {
    title: 'SERVO OUT 1 — Servo / ESC Output',
    connect: 'Your ESC (Electronic Speed Controller) or steering servo',
    wire: 'White = signal, Red = +5V, Black = GND (3-pin servo connector)',
    tip: 'This passes the throttle signal through to your ESC with the sound synced.',
  },
  SERVO2: {
    title: 'SERVO OUT 2 — Second Servo Output',
    connect: 'Landing gear servo, turret, or any secondary servo',
    wire: 'White = signal, Red = +5V, Black = GND (3-pin servo connector)',
    tip: 'Can be used for independent servo control.',
  },
  OUT1: {
    title: 'OUT1 — Headlights (Low-Side Switch)',
    connect: 'LED negative (–). Connect LED positive (+) to battery positive (+).',
    wire: 'Single wire: OUT1 → LED (–) → 330Ω resistor → Battery (+)',
    tip: '⚠️ OUT1 switches to GND (low-side). ALWAYS use a resistor (220–470Ω) with LEDs!',
  },
  OUT2: {
    title: 'OUT2 — Tail Lights (Low-Side Switch)',
    connect: 'LED negative (–). Connect LED positive (+) to battery positive (+).',
    wire: 'Single wire: OUT2 → LED (–) → 330Ω resistor → Battery (+)',
    tip: '⚠️ ALWAYS use a resistor (220–470Ω) with LEDs to prevent burning them out!',
  },
  OUT3: {
    title: 'OUT3 — Left Turn Signal (Low-Side Switch)',
    connect: 'Left turn signal LED negative (–)',
    wire: 'Single wire: OUT3 → LED (–) → 330Ω resistor → Battery (+)',
    tip: 'Can be configured to flash automatically at a set rate.',
  },
  OUT4: {
    title: 'OUT4 — Right Turn Signal (Low-Side Switch)',
    connect: 'Right turn signal LED negative (–)',
    wire: 'Single wire: OUT4 → LED (–) → 330Ω resistor → Battery (+)',
    tip: 'Can be configured to flash automatically at a set rate.',
  },
  OUT5: {
    title: 'OUT5 — Muzzle Flash / Aux Light (Low-Side Switch)',
    connect: 'Muzzle flash LED or any auxiliary light',
    wire: 'Single wire: OUT5 → LED (–) → 330Ω resistor → Battery (+)',
    tip: 'Often linked to the machine gun sound trigger for realistic muzzle flash effect.',
  },
  OUT6: {
    title: 'OUT6 — Beacon / Rotating Light (Low-Side Switch)',
    connect: 'Beacon, rotating light, or any auxiliary light',
    wire: 'Single wire: OUT6 → LED (–) → 330Ω resistor → Battery (+)',
    tip: 'Can be set to flash/rotate at adjustable rates.',
  },
  PROG: {
    title: 'PROG — Program Button',
    connect: 'On-board button — press to enter programming mode',
    wire: 'No external wiring needed — it\'s built into the PCB',
    tip: 'Press and hold during power-on to reset settings. Press once while running to enter live program mode.',
  },
};

/* ============================================================
   DEFAULT SETTINGS
============================================================ */
const DEFAULT_SETTINGS = {
  idleRpm: 15,
  maxRpm: 100,
  startDelay: 5,
  throttleCurve: 'linear',
  autoStart: false,
  volume: 50,
  bank: 1,
  engineType: 'diesel',
  autoReconnect: false,
  out: [
    { mode: 'switching', flashRate: 5, polarity: 'negative' },
    { mode: 'switching', flashRate: 5, polarity: 'negative' },
    { mode: 'switching', flashRate: 5, polarity: 'negative' },
    { mode: 'switching', flashRate: 5, polarity: 'negative' },
    { mode: 'momentary', flashRate: 8, polarity: 'negative' },
    { mode: 'flashing',  flashRate: 3, polarity: 'negative' },
  ],
  srv1min: 10, srv1max: 90,
  srv2min: 10, srv2max: 90, srv2speed: 5,
};

/* ============================================================
   MAIN APPLICATION OBJECT
============================================================ */
const tbsApp = (() => {
  /* ── private state ─────────────────────────────────────── */
  let _port        = null;
  let _writer      = null;
  let _reader      = null;
  let _connected   = false;
  let _connecting  = false;
  let _readLoop    = null;
  let _holdInterval = null;
  let _lastSend    = 0;
  let _hazardInterval = null;
  let _hazardOn    = false;
  let _settings    = null;
  let _logLines    = [];
  let _lightStates = [false, false, false, false, false, false];
  let _portDisconnectHandler = null;

  /* ────────────────────────────────────────────────────────
     INIT
  ──────────────────────────────────────────────────────── */
  function init() {
    _settings = _loadSettings();

    // Check Web Serial API support
    if (!('serial' in navigator)) {
      document.getElementById('browser-warning').classList.add('show');
      document.getElementById('btn-connect').disabled = true;
    }

    // Build dynamic UI sections
    _buildCalibrationUI();
    _buildOutConfigUI();
    _buildCmdRefTable();

    // Restore UI from settings
    _applySettingsToUI();

    // Register Service Worker for PWA offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {/* offline OK */});
    }

    // Auto-reconnect checkbox listener
    _initAutoReconnect();

    // Pin diagram tooltips
    _initPinTooltips();

    _log('info', 'TBS Mini Programmer ready. Connect your USB adapter to begin.');

    // Listen for serial port connect/disconnect events
    if ('serial' in navigator) {
      navigator.serial.addEventListener('connect', () => {
        _log('info', 'USB serial device plugged in');
      });
      navigator.serial.addEventListener('disconnect', () => {
        _log('info', 'USB serial device unplugged');
        if (_connected) disconnect();
      });

      // Clean up any previously authorized but stale ports
      _forceCleanup();
    }
  }

  /* ────────────────────────────────────────────────────────
     CONNECTION
  ──────────────────────────────────────────────────────── */
  async function connect() {
    if (_connected || _connecting) return;

    // Clean up any stale connection first
    await _forceCleanup();

    _connecting = true;
    _setStatus('connecting', 'Connecting…');

    try {
      _port = await navigator.serial.requestPort();

      // Small delay for USB-to-serial adapters (CP2102, CH340, FTDI)
      await new Promise(r => setTimeout(r, 300));

      // Attempt to open with retry
      let opened = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await _port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', bufferSize: 255 });
          opened = true;
          break;
        } catch (openErr) {
          if (attempt < 2) {
            _log('info', `Open attempt ${attempt} failed, retrying…`);
            // Try closing first in case it was left open
            try { await _port.close(); } catch (_) {}
            await new Promise(r => setTimeout(r, 500));
          } else {
            throw openErr;
          }
        }
      }

      _writer = _port.writable.getWriter();
      _reader = _port.readable.getReader();

      _connected  = true;
      _connecting = false;
      _setStatus('connected', 'Connected');
      _showError('');

      document.getElementById('btn-connect').style.display = 'none';
      document.getElementById('btn-disconnect').style.display = '';

      // Show port info if available
      const info = _port.getInfo ? _port.getInfo() : {};
      document.getElementById('port-info').textContent =
        info.usbVendorId ? `USB ${info.usbVendorId.toString(16).toUpperCase()}:${info.usbProductId.toString(16).toUpperCase()}` : '';

      _log('info', 'Connected at 9600 baud, 8N1');

      // Listen for unexpected disconnect (USB unplug) — remove any prior listener first
      if (_portDisconnectHandler) {
        _port.removeEventListener('disconnect', _portDisconnectHandler);
      }
      _portDisconnectHandler = () => {
        _log('error', 'USB adapter was unplugged!');
        disconnect();
      };
      _port.addEventListener('disconnect', _portDisconnectHandler);

      // Start read loop
      _readLoop = _startReadLoop();

    } catch (err) {
      _connecting = false;
      _setStatus('disconnected', 'Connection failed');
      _showError(_friendlyError(err));
      _log('error', `Connection error: ${err.message}`);
      // Clean up failed attempt
      await _forceCleanup();
    }
  }

  async function disconnect() {
    try {
      await _forceCleanup();
    } finally {
      _connected  = false;
      _connecting = false;
      _setStatus('disconnected', 'Disconnected');
      document.getElementById('btn-connect').style.display = '';
      document.getElementById('btn-disconnect').style.display = 'none';
      document.getElementById('port-info').textContent = '';
      _log('info', 'Disconnected');

      if (_settings.autoReconnect) {
        setTimeout(() => { if (!_connected) connect(); }, 3000);
      }
    }
  }

  async function _forceCleanup() {
    try {
      if (_reader) {
        try { await _reader.cancel(); } catch (_) {}
        try { _reader.releaseLock(); } catch (_) {}
        _reader = null;
      }
      if (_writer) {
        try { await _writer.close(); } catch (_) {}
        try { _writer.releaseLock(); } catch (_) {}
        _writer = null;
      }
      if (_port) {
        try { await _port.close(); } catch (_) {}
        _port = null;
      }
    } catch (_) {}

    // Also try to close any previously authorized ports that might be lingering
    if (navigator.serial && navigator.serial.getPorts) {
      try {
        const ports = await navigator.serial.getPorts();
        for (const p of ports) {
          try { await p.close(); } catch (_) {}
        }
      } catch (_) {}
    }
  }

  async function _startReadLoop() {
    try {
      while (_reader) {
        const { value, done } = await _reader.read();
        if (done) break;
        if (value) {
          Array.from(value).forEach(b => {
            _log('recv', `0x${b.toString(16).toUpperCase().padStart(2,'0')}`, _describeCmd(b));
          });
        }
      }
    } catch (err) {
      if (_connected) {
        _log('error', `Read error: ${err.message}`);
        disconnect();
      }
    }
  }

  /* ────────────────────────────────────────────────────────
     SEND
  ──────────────────────────────────────────────────────── */
  async function send(byte) {
    if (!_connected || !_writer) {
      _log('error', 'Not connected — please connect first');
      return false;
    }
    // Debounce: 80ms between sends
    const now = Date.now();
    if (now - _lastSend < 80) return false;
    _lastSend = now;

    try {
      await _writer.write(new Uint8Array([byte]));
      _log('sent', `0x${byte.toString(16).toUpperCase().padStart(2,'0')}`, _describeCmd(byte));
      return true;
    } catch (err) {
      _log('error', `Send failed: ${err.message}`);
      disconnect();
      return false;
    }
  }

  /* ────────────────────────────────────────────────────────
     ENGINE
  ──────────────────────────────────────────────────────── */
  function engineStart() { send(0x01); }
  function engineStop()  { send(0x02); }

  function setRpm(val) {
    const v = parseInt(val, 10);
    document.getElementById('rpm-display').textContent = Math.round(v * 100);
    _settings.rpm = v;
    // Note: TBS Mini receives throttle via PROP1 (PWM from receiver).
    // Real-time RPM control via serial would require firmware-specific commands.
    // We log it so users can see the value.
    _log('info', `Throttle set to ${v}% (connect via PROP1 for hardware throttle)`);
  }

  function setEngineType(val) {
    _settings.engineType = val;
    _saveSettings();
  }

  /* ────────────────────────────────────────────────────────
     HOLD BUTTONS (horn / machine gun)
  ──────────────────────────────────────────────────────── */
  function holdStart(startByte) {
    holdStop(); // clear any existing hold
    send(startByte);
    _holdInterval = setInterval(() => send(startByte), 200);
  }

  function holdStop() {
    if (_holdInterval) {
      clearInterval(_holdInterval);
      _holdInterval = null;
    }
  }

  /* ────────────────────────────────────────────────────────
     VOLUME
  ──────────────────────────────────────────────────────── */
  function volUp() {
    send(0x41);
    if (_settings.volume < 100) _settings.volume = Math.min(100, _settings.volume + 10);
    _updateVolBar();
    _saveSettings();
  }

  function volDown() {
    send(0x42);
    if (_settings.volume > 0) _settings.volume = Math.max(0, _settings.volume - 10);
    _updateVolBar();
    _saveSettings();
  }

  function _updateVolBar() {
    document.getElementById('vol-bar').style.width = _settings.volume + '%';
    document.getElementById('vol-label').textContent = `Volume: ${_settings.volume}%`;
  }

  /* ────────────────────────────────────────────────────────
     SOUND BANKS
  ──────────────────────────────────────────────────────── */
  function nextBank() {
    send(0x31);
    _settings.bank = Math.min(8, _settings.bank + 1);
    document.getElementById('bank-display').textContent = _settings.bank;
    _saveSettings();
  }

  function prevBank() {
    send(0x32);
    _settings.bank = Math.max(1, _settings.bank - 1);
    document.getElementById('bank-display').textContent = _settings.bank;
    _saveSettings();
  }

  /* ────────────────────────────────────────────────────────
     LIGHTS
  ──────────────────────────────────────────────────────── */
  // out index is 1-based (OUT1=1 … OUT6=6)
  // Commands: ON = 0x51,0x53,0x55,0x57,0x59,0x5B  OFF = 0x52,0x54,0x56,0x58,0x5A,0x5C
  function toggleLight(outNum) {
    const idx = outNum - 1;
    const newState = !_lightStates[idx];
    _lightStates[idx] = newState;
    const onCmd  = 0x50 + (outNum * 2) - 1; // 0x51, 0x53, 0x55, 0x57, 0x59, 0x5B
    const offCmd = 0x50 + (outNum * 2);     // 0x52, 0x54, 0x56, 0x58, 0x5A, 0x5C
    send(newState ? onCmd : offCmd);
    _updateLightUI(outNum, newState);
  }

  function _setLight(outNum, state) {
    const idx = outNum - 1;
    _lightStates[idx] = state;
    const onCmd  = 0x50 + (outNum * 2) - 1;
    const offCmd = 0x50 + (outNum * 2);
    send(state ? onCmd : offCmd);
    _updateLightUI(outNum, state);
  }

  function _updateLightUI(outNum, state) {
    const el = document.getElementById(`light-out${outNum}`);
    if (el) el.classList.toggle('on', state);
  }

  function allLightsOn() {
    for (let i = 1; i <= 6; i++) _setLight(i, true);
  }

  function allLightsOff() {
    _stopHazard();
    for (let i = 1; i <= 6; i++) _setLight(i, false);
  }

  function toggleHazard() {
    if (_hazardInterval) { _stopHazard(); return; }
    _hazardOn = false;
    _hazardInterval = setInterval(() => {
      _hazardOn = !_hazardOn;
      _setLight(3, _hazardOn);
      _setLight(4, _hazardOn);
    }, 500);
  }

  function _stopHazard() {
    if (_hazardInterval) { clearInterval(_hazardInterval); _hazardInterval = null; }
    _setLight(3, false);
    _setLight(4, false);
  }

  /* ────────────────────────────────────────────────────────
     SETTINGS
  ──────────────────────────────────────────────────────── */
  function settingChange(key, value) {
    _settings[key] = typeof value === 'string' && !isNaN(value) ? Number(value) : value;

    // Update displayed label
    const labelEl = document.getElementById(`val-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
    if (labelEl) {
      if (key === 'startDelay') {
        labelEl.textContent = (Number(value) / 10).toFixed(1) + 's';
      } else if (key === 'srv2speed') {
        labelEl.textContent = value;
      } else {
        labelEl.textContent = value + '%';
      }
    }

    _saveSettings();
  }

  function exportSettings() {
    const json = JSON.stringify(_settings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'tbs-settings.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function resetSettings() {
    if (!confirm('Reset all settings to defaults?')) return;
    _settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    _saveSettings();
    _applySettingsToUI();
    _log('info', 'Settings reset to defaults');
  }

  function _saveSettings() {
    try { localStorage.setItem('tbs-settings', JSON.stringify(_settings)); } catch (_) {/* ignore */}
  }

  function _loadSettings() {
    try {
      const s = localStorage.getItem('tbs-settings');
      if (s) return Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), JSON.parse(s));
    } catch (_) {/* ignore */}
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  function _applySettingsToUI() {
    const s = _settings;
    _setSlider('set-idle-rpm',   'val-idle-rpm',   s.idleRpm,   v => v + '%');
    _setSlider('set-max-rpm',    'val-max-rpm',    s.maxRpm,    v => v + '%');
    _setSlider('set-start-delay','val-start-delay',s.startDelay,v => (v/10).toFixed(1) + 's');
    _setSlider('set-srv1-min',   'val-srv1-min',   s.srv1min,   v => v + '%');
    _setSlider('set-srv1-max',   'val-srv1-max',   s.srv1max,   v => v + '%');
    _setSlider('set-srv2-min',   'val-srv2-min',   s.srv2min,   v => v + '%');
    _setSlider('set-srv2-max',   'val-srv2-max',   s.srv2max,   v => v + '%');
    _setSlider('set-srv2-speed', 'val-srv2-speed', s.srv2speed, v => String(v));

    _setSelect('set-throttle-curve', s.throttleCurve);
    _setSelect('engine-type',        s.engineType);

    _setChecked('set-autostart',      s.autoStart);
    _setChecked('chk-autoreconnect',  s.autoReconnect);

    _updateVolBar();
    document.getElementById('bank-display').textContent = s.bank;
  }

  function _setSlider(id, labelId, val, fmt) {
    const el = document.getElementById(id);
    if (el) el.value = val;
    const lb = document.getElementById(labelId);
    if (lb) lb.textContent = fmt(val);
  }

  function _setSelect(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function _setChecked(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  }

  /* ────────────────────────────────────────────────────────
     CALIBRATION UI
  ──────────────────────────────────────────────────────── */
  function _buildCalibrationUI() {
    const container = document.getElementById('cal-channels');
    const channels = ['PROP1 (Throttle)', 'PROP2 (Aux)', 'PROP3 (Aux / Bank)'];
    channels.forEach((name, i) => {
      const div = document.createElement('div');
      div.className = 'settings-group';
      div.innerHTML = `
        <div class="settings-group-title">${name}</div>
        <div class="slider-row">
          <label>Min</label>
          <input type="range" min="0" max="100" value="10" id="cal-${i}-min"
            oninput="document.getElementById('cal-${i}-pos').style.left=(this.value/100*90)+'%'" />
          <span class="slider-val">10%</span>
        </div>
        <div class="slider-row">
          <label>Center</label>
          <input type="range" min="0" max="100" value="50" id="cal-${i}-ctr"
            oninput="document.getElementById('cal-${i}-pos').style.left=(this.value/100*90)+'%'" />
          <span class="slider-val">50%</span>
        </div>
        <div class="slider-row">
          <label>Max</label>
          <input type="range" min="0" max="100" value="90" id="cal-${i}-max"
            oninput="document.getElementById('cal-${i}-pos').style.left=(this.value/100*90)+'%'" />
          <span class="slider-val">90%</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px; margin-top:8px">
          <div class="cal-bar-wrap" style="flex:1; position:relative; height:12px; background:var(--accent); border-radius:6px">
            <div class="cal-indicator" id="cal-${i}-pos" style="left:50%"></div>
          </div>
          <button class="btn btn-warning" style="min-height:36px; font-size:.8rem"
            onclick="tbsApp.teachChannel(${i})">🎯 Teach</button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  function teachChannel(idx) {
    _log('info', `Teaching channel ${idx + 1} — move stick to endpoints, then center`);
    // In a real implementation this would send calibration start/end commands.
    // Without official firmware docs for calibration bytes we log the action.
  }

  /* ────────────────────────────────────────────────────────
     OUTPUT CONFIGURATION UI
  ──────────────────────────────────────────────────────── */
  const OUT_NAMES = [
    'OUT1 — Headlights',
    'OUT2 — Tail Lights',
    'OUT3 — Left Turn',
    'OUT4 — Right Turn',
    'OUT5 — Muzzle/Aux',
    'OUT6 — Beacon/Aux',
  ];

  function _buildOutConfigUI() {
    const container = document.getElementById('out-config-rows');
    OUT_NAMES.forEach((name, i) => {
      const cfg = _settings.out[i];
      const row = document.createElement('div');
      row.className = 'out-config-row';
      row.innerHTML = `
        <span class="out-name">${name.split(' — ')[0]}</span>
        <span class="text-dim" style="flex:1; font-size:.8rem">${name.split(' — ')[1]}</span>
        <select style="width:110px" onchange="tbsApp.updateOutCfg(${i},'mode',this.value)">
          <option value="switching" ${cfg.mode==='switching'?'selected':''}>Switching</option>
          <option value="momentary" ${cfg.mode==='momentary'?'selected':''}>Momentary</option>
          <option value="flashing"  ${cfg.mode==='flashing'?'selected':''}>Flashing</option>
        </select>
        <select style="width:100px" onchange="tbsApp.updateOutCfg(${i},'polarity',this.value)">
          <option value="negative" ${cfg.polarity==='negative'?'selected':''}>Low-side</option>
          <option value="positive" ${cfg.polarity==='positive'?'selected':''}>High-side</option>
        </select>
      `;
      container.appendChild(row);
    });
  }

  function updateOutCfg(idx, key, val) {
    if (_settings.out[idx]) {
      _settings.out[idx][key] = val;
      _saveSettings();
    }
  }

  /* ────────────────────────────────────────────────────────
     COMMAND REFERENCE TABLE
  ──────────────────────────────────────────────────────── */
  function _buildCmdRefTable() {
    const tbody = document.getElementById('cmd-ref-body');
    CMD_MAP.forEach(cmd => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border)';
      tr.innerHTML = `
        <td style="padding:5px 8px; font-family:monospace; color:var(--yellow)">
          0x${cmd.hex.toString(16).toUpperCase().padStart(2,'0')}
        </td>
        <td style="padding:5px 8px; font-family:monospace; color:var(--text-dim)">${cmd.hex}</td>
        <td style="padding:5px 8px">${cmd.name}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ────────────────────────────────────────────────────────
     SERIAL CONSOLE
  ──────────────────────────────────────────────────────── */
  function _log(type, hex, desc) {
    const el = document.getElementById('serial-log');
    if (!el) return;

    const time = new Date().toTimeString().slice(0,8);
    const dir  = type === 'sent' ? '→' : type === 'recv' ? '←' : '·';
    const cls  = type === 'sent' ? 'log-sent' : type === 'recv' ? 'log-recv' :
                 type === 'error' ? 'log-error' : 'log-info';

    const line = document.createElement('div');
    line.className = `log-line ${cls}`;
    line.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-dir">${dir}</span>
      <span class="log-hex">${hex || ''}</span>
      <span class="log-desc">${desc || hex || ''}</span>
    `;
    el.appendChild(line);
    _logLines.push(`${time} ${dir} ${hex || ''} ${desc || ''}`);
    // Keep max 500 lines
    while (el.children.length > 500) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  }

  function clearLog() {
    const el = document.getElementById('serial-log');
    if (el) el.innerHTML = '';
    _logLines = [];
  }

  function copyLog() {
    const text = _logLines.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => alert('Log copied to clipboard!'));
    } else {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('Log copied to clipboard!');
    }
  }

  function sendCustomCmd() {
    const input = document.getElementById('cmd-input');
    const raw = input.value.trim();
    if (!raw) return;

    let byte;
    if (raw.startsWith('0x') || raw.startsWith('0X')) {
      byte = parseInt(raw, 16);
    } else {
      byte = parseInt(raw, 10);
    }

    if (isNaN(byte) || byte < 0 || byte > 255) {
      _showError('Enter a valid byte value: hex (0x21) or decimal (33), range 0–255');
      return;
    }

    send(byte);
    input.value = '';
  }

  /* ────────────────────────────────────────────────────────
     TAB NAVIGATION
  ──────────────────────────────────────────────────────── */
  function switchTab(name) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const panel = document.getElementById(`tab-${name}`);
    if (panel) panel.classList.add('active');

    const btn = document.querySelector(`.tab-btn[data-tab="${name}"]`);
    if (btn) btn.classList.add('active');
  }

  /* ────────────────────────────────────────────────────────
     STATUS HELPERS
  ──────────────────────────────────────────────────────── */
  function _setStatus(state, text) {
    const dot  = document.getElementById('conn-status-dot');
    const txt  = document.getElementById('conn-status-text');
    dot.className  = state;
    txt.textContent = text;
  }

  function _showError(msg) {
    const el = document.getElementById('conn-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('show', !!msg);
  }

  function _friendlyError(err) {
    const msg = (err && err.message) ? err.message.toLowerCase() : '';
    if (msg.includes('no port selected') || msg.includes('user cancelled'))
      return 'No port selected. Click "Connect USB" and choose your USB-to-Serial adapter from the list.';
    if (msg.includes('access denied') || msg.includes('permission'))
      return 'Permission denied. Make sure only one tab/program is using the serial port. Try unplugging and replugging your USB adapter.';
    if (msg.includes('failed to open'))
      return 'Could not open port. Try these steps:\n1. Unplug your USB adapter, wait 3 seconds, plug it back in\n2. Close ALL other browser tabs\n3. Close Arduino IDE, PuTTY, or any serial monitors\n4. Try clicking Connect again';
    if (msg.includes('the port is already open'))
      return 'Port is already open in another tab or was not closed properly. Try refreshing the page, or unplug and replug your USB adapter.';
    return `Connection error: ${err.message}. Make sure your USB cable is plugged in and you're using Chrome or Edge.`;
  }

  /* ────────────────────────────────────────────────────────
     COMMAND DESCRIPTION LOOKUP
  ──────────────────────────────────────────────────────── */
  function _describeCmd(byte) {
    const c = CMD_MAP.find(x => x.hex === byte);
    return c ? c.name : `Unknown (0x${byte.toString(16).toUpperCase().padStart(2,'0')})`;
  }

  /* ────────────────────────────────────────────────────────
     PIN DIAGRAM TOOLTIPS
  ──────────────────────────────────────────────────────── */
  function _initPinTooltips() {
    const tooltip = document.getElementById('pin-tooltip');
    if (!tooltip) return;

    document.querySelectorAll('.pcb-pin').forEach(pin => {
      const key = pin.dataset.pin;
      const data = PIN_DATA[key];
      if (!data) return;

      function showTip(e) {
        tooltip.innerHTML = `
          <div class="tt-title">${data.title}</div>
          <div class="tt-row"><span class="tt-label">Connect:</span><span>${data.connect}</span></div>
          <div class="tt-row"><span class="tt-label">Wire:</span><span>${data.wire}</span></div>
          ${data.tip ? `<div class="tt-warn">⚠️ ${data.tip}</div>` : ''}
        `;
        tooltip.classList.add('show');
        _positionTooltip(e);
      }

      pin.addEventListener('mouseenter', showTip);
      pin.addEventListener('mousemove',  _positionTooltip);
      pin.addEventListener('mouseleave', () => tooltip.classList.remove('show'));
      pin.addEventListener('focus',      showTip);
      pin.addEventListener('blur',       () => tooltip.classList.remove('show'));
      pin.addEventListener('click',      showTip);
      pin.addEventListener('touchstart', showTip, { passive: true });
    });
  }

  function _positionTooltip(e) {
    const tooltip = document.getElementById('pin-tooltip');
    if (!tooltip || !tooltip.classList.contains('show')) return;

    let x = 0, y = 0;
    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX + 14;
      y = e.touches[0].clientY + 14;
    } else if (e.clientX !== undefined) {
      x = e.clientX + 14;
      y = e.clientY + 14;
    }

    // Keep within viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (x + 290 > vw) x = vw - 295;
    if (y + 160 > vh) y = y - 170;
    if (x < 4) x = 4;
    if (y < 4) y = 4;

    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
  }

  /* ────────────────────────────────────────────────────────
     AUTO-RECONNECT CHECKBOX
  ──────────────────────────────────────────────────────── */
  function _initAutoReconnect() {
    const el = document.getElementById('chk-autoreconnect');
    if (el) {
      el.addEventListener('change', () => {
        _settings.autoReconnect = el.checked;
        _saveSettings();
      });
    }
  }

  /* ────────────────────────────────────────────────────────
     PUBLIC API
  ──────────────────────────────────────────────────────── */
  return {
    init,
    connect,
    disconnect,
    forceCleanup: _forceCleanup,
    send,
    engineStart,
    engineStop,
    setRpm,
    setEngineType,
    holdStart,
    holdStop,
    volUp,
    volDown,
    nextBank,
    prevBank,
    toggleLight,
    allLightsOn,
    allLightsOff,
    toggleHazard,
    settingChange,
    exportSettings,
    resetSettings,
    teachChannel,
    updateOutCfg,
    clearLog,
    copyLog,
    sendCustomCmd,
    switchTab,
  };
})();

/* ============================================================
   START
============================================================ */
document.addEventListener('DOMContentLoaded', () => tbsApp.init());
