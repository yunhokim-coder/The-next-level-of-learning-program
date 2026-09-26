// 캔버스 장면: 광야 배경, 캐릭터, 연출 효과.
// 기본 해상도 320×180에 그린 뒤 CSS로 정수배 확대한다 (main.js의 fit 참고).
(function () {
  const W = 320;
  const H = 180;
  const GROUND = 148;

  let canvas;
  let ctx;
  let lastTs = 0;
  let t = 0; // 경과 시간(초)

  const state = {
    mode: 'title', // 'title' | 'walk'
    walking: false,
    scroll: 0,
    shake: 0,
    focus: null,
    focusAt: 0,
    particles: [],
    actors: {},
  };

  // ---------- 준비: 움직이지 않는 배경은 미리 한 장으로 구워 둔다 ----------
  const layers = {};

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // 두 색을 체크무늬로 섞어 도트 느낌의 그라데이션을 만든다
  function bands(g, stops, y0, y1) {
    const n = stops.length - 1;
    const step = (y1 - y0) / n;
    for (let i = 0; i < n; i++) {
      const top = Math.round(y0 + i * step);
      const bottom = Math.round(y0 + (i + 1) * step);
      g.fillStyle = stops[i];
      g.fillRect(0, top, W, bottom - top);
      g.fillStyle = stops[i + 1];
      for (let y = bottom - 3; y < bottom; y++) {
        for (let x = (y + i) % 2; x < W; x += 2) g.fillRect(x, y, 1, 1);
      }
    }
  }

  function bakeLayers() {
    // 낮 하늘
    const day = makeCanvas(W, H);
    let g = day.getContext('2d');
    bands(g, ['#6fb8ff', '#8fcbff', '#b5ddff', '#ffe3b8', '#ffd09a'], 0, GROUND - 20);
    g.fillStyle = '#ffd09a';
    g.fillRect(0, GROUND - 20, W, H);
    layers.day = day;

    // 밤 하늘 (타이틀)
    const night = makeCanvas(W, H);
    g = night.getContext('2d');
    bands(g, ['#0b0b1e', '#141432', '#1d1d4a', '#2c2560'], 0, GROUND);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = i % 5 ? '#8b8bd8' : '#ffffff';
      g.fillRect((i * 97) % W, (i * 53) % (GROUND - 30), 1, 1);
    }
    layers.night = night;

    // 먼 모래언덕 (가로로 이어 붙일 수 있게 주기를 320에 맞춘다)
    layers.dunesFar = hills('#f3cf8f', '#e6b877', 112, [[7, 160, 0], [3, 80, 1.3]]);
    layers.dunesNear = hills('#eab06a', '#d69753', 128, [[6, 320, 2], [3, 64, 0.4]]);

    // 가까운 소품: 선인장과 바위
    const props = makeCanvas(W, H);
    g = props.getContext('2d');
    cactus(g, 30, GROUND, 18);
    rock(g, 110, GROUND, 9);
    cactus(g, 196, GROUND, 13);
    rock(g, 268, GROUND, 6);
    layers.props = props;

    // 벽돌 바닥
    const ground = makeCanvas(W + 16, H - GROUND);
    g = ground.getContext('2d');
    g.fillStyle = '#f39a4a';
    g.fillRect(0, 0, ground.width, ground.height);
    g.fillStyle = '#ffd08a';
    g.fillRect(0, 0, ground.width, 2);
    g.fillStyle = '#c96a2c';
    for (let row = 0; row * 6 + 2 < ground.height; row++) {
      const y = 2 + row * 6;
      g.fillRect(0, y + 5, ground.width, 1);
      for (let x = row % 2 ? 8 : 0; x < ground.width; x += 16) g.fillRect(x, y, 1, 5);
    }
    layers.ground = ground;
  }

  function hills(fill, edge, base, waves) {
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');
    for (let x = 0; x < W; x++) {
      let y = base;
      waves.forEach(([amp, period, phase]) => {
        y += amp * Math.sin((2 * Math.PI * x) / period + phase);
      });
      y = Math.round(y);
      g.fillStyle = edge;
      g.fillRect(x, y, 1, 2);
      g.fillStyle = fill;
      g.fillRect(x, y + 2, 1, H - y);
    }
    return c;
  }

  function cactus(g, x, ground, h) {
    const K = '#1b1b24';
    const green = '#4caf50';
    const dark = '#2e7d32';
    const box = (bx, by, bw, bh) => {
      g.fillStyle = K;
      g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    };
    box(x, ground - h, 5, h);
    box(x - 5, ground - h + 5, 4, 3);
    box(x - 5, ground - h + 1, 3, 5);
    box(x + 6, ground - h + 8, 4, 3);
    box(x + 8, ground - h + 3, 3, 6);
    g.fillStyle = green;
    g.fillRect(x, ground - h, 5, h);
    g.fillRect(x - 5, ground - h + 5, 5, 3);
    g.fillRect(x - 5, ground - h + 1, 3, 5);
    g.fillRect(x + 5, ground - h + 8, 5, 3);
    g.fillRect(x + 8, ground - h + 3, 3, 6);
    g.fillStyle = dark;
    g.fillRect(x + 3, ground - h + 1, 1, h - 1);
  }

  function rock(g, x, ground, r) {
    g.fillStyle = '#1b1b24';
    g.fillRect(x - r - 1, ground - r + 1, r * 2 + 2, r);
    g.fillRect(x - r + 1, ground - r - 1, r * 2 - 2, 2);
    g.fillStyle = '#a58b6f';
    g.fillRect(x - r, ground - r + 1, r * 2, r - 1);
    g.fillRect(x - r + 2, ground - r, r * 2 - 4, 1);
    g.fillStyle = '#c9b193';
    g.fillRect(x - r + 2, ground - r + 2, r - 1, 2);
  }

  // ---------- 멀리서 길을 비춰주는 구름과 불빛 ----------
  function drawCloudPillar(x, top, bottom) {
    const puffs = Math.floor((bottom - top) / 9);
    for (let i = 0; i <= puffs; i++) {
      const y = bottom - i * 9;
      const wob = Math.round(Math.sin(t * 1.5 + i) * 2);
      const r = 7 + ((i * 3) % 3);
      disc(x + wob, y, r + 1, '#9fb8d8');
      disc(x + wob, y - 1, r, '#ffffff');
      disc(x + wob - 2, y - 3, Math.max(2, r - 4), '#eef6ff');
    }
  }

  function drawFirePillar(x, top, bottom) {
    const colors = ['#ff5a3c', '#ff9a3c', '#ffd23f'];
    for (let y = top; y < bottom; y += 2) {
      const k = (y - top) / (bottom - top);
      const w = 4 + Math.round(3 * Math.sin(t * 8 + y * 0.35)) + Math.round(k * 3);
      ctx.fillStyle = colors[0];
      ctx.fillRect(x - w, y, w * 2, 2);
      ctx.fillStyle = colors[1];
      ctx.fillRect(x - w + 2, y, Math.max(0, w * 2 - 4), 2);
      if (w > 4) {
        ctx.fillStyle = colors[2];
        ctx.fillRect(x - 1, y, 2, 2);
      }
    }
    // 불꽃 끝이 튀는 효과
    if (Math.random() < 0.3) spark(x + (Math.random() * 10 - 5), top + 4, '#ffd23f', -0.3);
  }

  function disc(cx, cy, r, color) {
    ctx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(cx - half, cy + dy, half * 2, 1);
    }
  }

  // ---------- 캐릭터 ----------
  const PARTY = ['C', 'S', 'I', 'D'];

  function resetActors() {
    state.actors = {
      hero: { x: 196, y: GROUND, visible: true },
      D: { x: 158, y: GROUND, visible: true },
      I: { x: 120, y: GROUND, visible: true },
      S: { x: 84, y: GROUND, visible: true },
      C: { x: 46, y: GROUND, visible: true },
      angel: { x: 360, y: 40, tx: 212, ty: 64, visible: false },
      devil: { x: 252, y: GROUND + 30, ty: GROUND, visible: false, leaving: false },
      mamba: { x: 272, rise: 0, target: 0, visible: false },
    };
  }

  function hop(id) {
    if (state.focus !== id) return 0;
    const dt = t - state.focusAt;
    return dt < 0.36 ? Math.round(Math.sin((dt / 0.36) * Math.PI) * 5) : 0;
  }

  function drawSprite(img, x, feetY, scale = 1) {
    if (!img) return;
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, Math.round(x - w / 2), Math.round(feetY - h), w, h);
  }

  function drawParty() {
    const a = state.actors;
    PARTY.forEach((k, i) => {
      const act = a[k];
      const bob = state.walking ? (Math.floor(t * 6 + i) % 2 ? -1 : 0) : 0;
      drawShadow(act.x, GROUND, 12);
      drawSprite(Sprites.party[k], act.x, act.y + bob - hop(k));
    });
    const h = a.hero;
    const frame = state.walking ? Math.floor(t * 6) % 2 : 0;
    drawShadow(h.x, GROUND, 10);
    drawSprite(Sprites.frames.hero[frame], h.x, h.y - hop('hero'), 2);
  }

  function drawShadow(x, y, r) {
    ctx.fillStyle = 'rgba(120, 60, 20, 0.25)';
    ctx.fillRect(Math.round(x - r), y - 1, r * 2, 2);
  }

  function drawAngel() {
    const a = state.actors.angel;
    if (!a.visible) return;
    a.x += (a.tx - a.x) * 0.06;
    a.y += (a.ty - a.y) * 0.06;
    const y = a.y + Math.round(Math.sin(t * 3) * 3) - hop('angel');
    const frame = Math.floor(t * 8) % 2;
    // 은은한 빛
    ctx.fillStyle = 'rgba(255, 240, 150, 0.25)';
    disc(Math.round(a.x), Math.round(y - 13), 16, 'rgba(255, 240, 150, 0.18)');
    drawSprite(Sprites.frames.angel[frame], a.x, y, 2);
    if (Math.random() < 0.25) spark(a.x + (Math.random() * 20 - 10), y - Math.random() * 20, '#fff6b0', 0.2);
  }

  function drawDevil() {
    const d = state.actors.devil;
    if (!d.visible) return;
    d.y += (d.ty - d.y) * 0.15;
    const frame = Math.floor(t * 4) % 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, GROUND + 1);
    ctx.clip();
    drawSprite(Sprites.frames.devil[frame], d.x + Math.round(Math.sin(t * 2) * 2), d.y - hop('devil'), 2);
    ctx.restore();
    if (d.leaving && d.y > GROUND + 26) d.visible = false;
  }

  // 블랙맘바 몸통: 낮은 해상도(1/2)로 그린 뒤 2배로 키워 도트 크기를 주인공과 맞춘다
  const snakeBuf = makeCanvas(60, 60);
  function drawMamba() {
    const m = state.actors.mamba;
    if (!m.visible) return;
    m.rise += (m.target - m.rise) * 0.05;
    const g = snakeBuf.getContext('2d');
    g.clearRect(0, 0, 60, 60);
    const sway = Math.sin(t * 2);
    const back = [];
    const front = [];
    // 바닥에 두 겹 똬리: 뒤쪽 반원은 먼저, 앞쪽 반원은 나중에 그려 입체감을 준다
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const p = [30 + Math.cos(a) * 14, 52 + Math.sin(a) * 5, 3.6];
      (Math.sin(a) < 0 ? back : front).push(p);
    }
    // 목이 S자로 솟아오르고 끝에서 앞(왼쪽)으로 고개를 내민다
    const neck = [];
    for (let i = 0; i <= 36; i++) {
      const k = i / 36;
      const x = 44 - k * 20 + Math.sin(k * Math.PI * 2) * 7 * (1 - k * 0.4) + sway * k * 2;
      neck.push([x, 52 - k * 40, 3.5 - k * 0.8]);
    }
    // 윤곽선을 먼저 모두 그리고 몸통을 덮어야 마디마다 선이 겹쳐 보이지 않는다
    const seg = (list, belly) => {
      const pts = list.map(([x, y, r]) => [Math.round(x), Math.round(y), Math.round(r)]);
      g.fillStyle = '#1b1b24';
      pts.forEach(([cx, cy, rr]) => circle(g, cx, cy, rr + 1));
      g.fillStyle = '#2b2b33';
      pts.forEach(([cx, cy, rr]) => circle(g, cx, cy, rr));
      pts.forEach(([cx, cy, rr], i) => {
        if (belly === 'left' && i % 4 === 0) {
          g.fillStyle = '#4a4a57';
          g.fillRect(cx - 1, cy - rr + 1, 2, 1);
        }
        g.fillStyle = '#caa46a';
        if (belly === 'left') g.fillRect(cx - rr, cy - 1, 2, 2);
        else if (i % 3 === 0) g.fillRect(cx - 1, cy + rr - 1, 2, 1);
      });
    };
    seg(back, 'down');
    seg(neck, 'left');
    seg(front, 'down');
    const pts = neck;
    const head = pts[pts.length - 1];
    const hx = Math.round(head[0]) - 7;
    const hy = Math.round(head[1]) - 5;
    g.drawImage(Sprites.frames.mambaHead[0], hx, hy);
    if (Math.floor(t * 3) % 3 === 0) {
      g.fillStyle = '#e8414f';
      g.fillRect(hx - 2, hy + 5, 2, 1);
      g.fillRect(hx - 3, hy + 4, 1, 1);
      g.fillRect(hx - 3, hy + 6, 1, 1);
    }

    const size = 116;
    const top = GROUND + 6 - Math.round(size * m.rise) - hop('mamba');
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, GROUND + 4);
    ctx.clip();
    ctx.drawImage(snakeBuf, m.x - size / 2, top, size, size);
    ctx.restore();
  }

  function circle(g, cx, cy, r) {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      g.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
    }
  }

  // ---------- 입자 효과 ----------
  function spark(x, y, color, vy = 0) {
    state.particles.push({ x, y, vx: Math.random() * 0.6 - 0.3, vy: vy - Math.random() * 0.4, life: 1, color, size: 1 });
  }

  function burst(x, y, color, n = 14, size = 2) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.6 + Math.random() * 1.4;
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6, life: 1, color, size });
    }
  }

  function drawParticles(dt) {
    state.particles = state.particles.filter((p) => p.life > 0);
    state.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life -= dt * 1.4;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    });
  }

  // ---------- 그리기 루프 ----------
  function tile(img, offset, y = 0) {
    const x = -Math.round(offset % img.width);
    ctx.drawImage(img, x, y);
    ctx.drawImage(img, x + img.width, y);
  }

  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    t += dt;
    if (state.walking) state.scroll += dt * 28;

    ctx.save();
    if (state.shake > 0) {
      state.shake -= dt;
      ctx.translate(Math.round(Math.random() * 4 - 2), Math.round(Math.random() * 3 - 1));
    }

    if (state.mode === 'title') {
      ctx.drawImage(layers.night, 0, 0);
      tile(layers.ground, state.scroll, GROUND);
      drawShadow(64, GROUND, 10);
      drawSprite(Sprites.frames.hero[Math.floor(t * 2) % 2], 64, GROUND, 2);
    } else {
      ctx.drawImage(layers.day, 0, 0);
      disc(262, 26, 9, '#fff8d8');
      drawCloudPillar(34, 70, 116);
      drawFirePillar(296, 72, 118);
      tile(layers.dunesFar, state.scroll * 0.2);
      tile(layers.dunesNear, state.scroll * 0.45);
      tile(layers.props, state.scroll * 0.8);
      tile(layers.ground, state.scroll, GROUND);
      drawMamba();
      drawParty();
      drawDevil();
      drawAngel();
    }
    drawParticles(dt);
    ctx.restore();
    requestAnimationFrame(frame);
  }

  // ---------- main.js에서 쓰는 명령 ----------
  window.Game = {
    W,
    H,
    init(el) {
      canvas = el;
      canvas.width = W;
      canvas.height = H;
      ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      bakeLayers();
      resetActors();
      requestAnimationFrame(frame);
    },
    setMode(mode) {
      state.mode = mode;
      if (mode === 'title') {
        resetActors();
        state.walking = true;
        state.particles = [];
      }
    },
    reset() {
      resetActors();
      state.scroll = 0;
      state.particles = [];
      state.focus = null;
    },
    walk(on) {
      state.walking = on;
    },
    focus(id) {
      state.focus = id;
      state.focusAt = t;
    },
    enter(id) {
      const a = state.actors[id];
      a.visible = true;
      if (id === 'angel') {
        a.x = 360;
        a.y = 20;
        Sound.play('sparkle');
      }
      if (id === 'devil') {
        a.y = GROUND + 30;
        a.ty = GROUND;
        a.leaving = false;
        burst(a.x, GROUND - 2, '#c9a36a', 16);
        Sound.play('poof');
      }
      if (id === 'mamba') {
        a.rise = 0;
        a.target = 1;
        state.shake = 1.4;
        for (let i = 0; i < 4; i++) burst(a.x - 30 + i * 20, GROUND - 1, '#e6b877', 10);
        Sound.play('rumble');
      }
    },
    leave(id) {
      const a = state.actors[id];
      if (id === 'devil') {
        a.ty = GROUND + 34;
        a.leaving = true;
        burst(a.x, GROUND - 2, '#9a6ad0', 18);
        Sound.play('poof');
      }
    },
    cheer() {
      const h = state.actors.hero;
      burst(h.x, h.y - 40, '#ffd23f', 24);
      burst(h.x, h.y - 40, '#ff6ad5', 12);
      Sound.play('powerup');
    },
  };
})();
