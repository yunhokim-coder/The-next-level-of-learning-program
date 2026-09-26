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

  // 아이폰은 무음 모드(옆면 스위치)일 때 웹 효과음을 막는다.
  // 소리를 '재생(playback)' 종류로 알리면 동영상처럼 무음 모드에서도 들린다.
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch (e) {
    /* 지원하지 않는 브라우저 */
  }

  // 예전 아이폰용: 소리 없는 오디오를 한 번 틀어 두면 같은 효과가 난다
  let silentEl = null;
  function silentAudio() {
    if (silentEl) return;
    const rate = 8000;
    const n = 800;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF');
    v.setUint32(4, 36 + n * 2, true);
    str(8, 'WAVEfmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    str(36, 'data');
    v.setUint32(40, n * 2, true);
    silentEl = document.createElement('audio');
    silentEl.src = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    silentEl.loop = true;
    silentEl.setAttribute('playsinline', '');
    silentEl.volume = 0.01;
    const p = silentEl.play();
    if (p && p.catch) p.catch(() => {});
  }

  // 브라우저 정책상 사용자가 화면을 누른 순간에만 소리를 켤 수 있다
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (!ctx) return;
    if (ctx.state !== 'running') ctx.resume();
    silentAudio();
    // 아주 짧은 빈 소리를 한 번 내야 풀리는 기기가 있다
    const b = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.connect(ctx.destination);
    src.start(0);
  }

  // 휴대폰은 화면을 껐다 켜거나 다른 앱에 다녀오면 소리를 멈춘다. 다시 누를 때마다 깨운다
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) =>
    window.addEventListener(
      ev,
      () => {
        if (!ctx || ctx.state !== 'running') unlock();
      },
      { passive: true }
    )
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (silentEl) silentEl.pause();
    } else if (silentEl && !muted) {
      const p = silentEl.play();
      if (p && p.catch) p.catch(() => {});
    }
  });

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
