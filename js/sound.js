// 8비트 효과음을 Web Audio API로 직접 만든다 (외부 음원 파일 없음).
(function () {
  const STORE_KEY = 'nextlevel.muted';
  let ctx = null;
  let muted = false;
  try {
    muted = localStorage.getItem(STORE_KEY) === '1';
  } catch (e) {
    /* 기본값 유지 */
  }

  // 브라우저 정책상 사용자가 처음 누른 뒤에야 소리를 켤 수 있다
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, { type = 'square', vol = 0.06, slide = 0, delay = 0 } = {}) {
    if (muted || !ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol = 0.08) {
    if (muted || !ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  const sfx = {
    blip: () => tone(660, 0.03, { vol: 0.025 }),
    select: () => tone(880, 0.08, { slide: 220 }),
    start: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { delay: i * 0.09 })),
    sparkle: () => [1319, 1568, 2093].forEach((f, i) => tone(f, 0.08, { type: 'triangle', vol: 0.05, delay: i * 0.06 })),
    poof: () => noise(0.25, 0.06),
    rumble: () => {
      noise(0.8, 0.1);
      tone(70, 0.8, { type: 'sawtooth', vol: 0.05, slide: -30 });
    },
    powerup: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.1, { vol: 0.05, delay: i * 0.07 })),
    clear: () => [523, 523, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.14, { delay: i * 0.15 })),
  };

  window.Sound = {
    unlock,
    play: (name) => sfx[name] && sfx[name](),
    get muted() {
      return muted;
    },
    setMuted(v) {
      muted = v;
      try {
        localStorage.setItem(STORE_KEY, v ? '1' : '0');
      } catch (e) {
        /* 이번 방문 동안만 유지 */
      }
    },
  };
})();
