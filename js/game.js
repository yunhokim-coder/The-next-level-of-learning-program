// 캔버스 장면: 꿈의 마을, 광야 배경, 캐릭터, 연출 효과.
// 게임 좌표는 320×180. 캔버스는 화면 해상도에 맞춰 k배로 그려 원작 캐릭터를 선명하게 보여준다.
(function () {
  const W = 320;
  const H = 180;
  const GROUND = 148;

  let canvas;
  let ctx;
  let k = 1; // 캔버스 실제 픽셀 / 게임 픽셀
  let lastTs = 0;
  let t = 0; // 경과 시간(초)

  const state = {
    mode: 'title', // 'title' | 'play'
    scene: 'wild', // 'village' | 'wild'
    walking: false,
    scroll: 0,
    shake: 0,
    dark: 0,
    darkTarget: 0,
    fade: 0,
    fadeTarget: 0,
    partyOffset: 0,
    focus: null,
    focusAt: 0,
    particles: [],
    actors: {},
    gem: { visible: false, x: 160, y: 62, tx: 160, ty: 62, taken: false },
    showcase: null, // 파티원 소개 장면: { key, at }
    sphinx: false,
    knocked: false,
    battle: null,
    knockedAt: 0,
    compass: { visible: false, x: 0, y: 0, tx: 0, ty: 0 },
    portal: 0,
    portalTarget: 0,
  };

  const CARD_COLORS = { D: '#dc143c', I: '#8fbf5e', S: '#f5d33f', C: '#0070c0' };

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
    // 낮 하늘 (광야)
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

    // 노을 진 꿈의 마을
    const village = makeCanvas(W, H);
    g = village.getContext('2d');
    bands(g, ['#5b3f8f', '#8a4f9e', '#d0668f', '#f08a6a', '#f7b267'], 0, 120);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = '#ffe9a8';
      g.fillRect((i * 71) % W, (i * 37) % 70, 1, 1);
    }
    hillsInto(g, '#6b4a8a', '#5a3d78', 112, [[8, 160, 1], [4, 80, 0]]);
    hillsInto(g, '#3f6b3a', '#2f5a2c', 124, [[4, 106.67, 0.5], [2, 40, 1]]);
    house(g, 36, 138, 44, 26, '#b8452f');
    house(g, 130, 134, 30, 20, '#a33d2a');
    house(g, 228, 138, 50, 28, '#b8452f');
    g.fillStyle = '#4c8a3e';
    g.fillRect(0, 138, W, H - 138);
    g.fillStyle = '#d99a52';
    for (let y = 138; y < H; y++) {
      const half = Math.round(6 + (y - 138) * 0.9);
      g.fillRect(160 - half, y, half * 2, 1);
    }
    [[20, 150], [30, 158], [290, 152], [300, 162], [110, 160]].forEach(([x, y], i) => {
      g.fillStyle = i % 2 ? '#ffcf3f' : '#ff5a6e';
      g.fillRect(x, y, 3, 3);
      g.fillStyle = '#2f5a2c';
      g.fillRect(x + 1, y + 3, 1, 3);
    });
    layers.village = village;

    // 피라미드 (에피소드 3)
    const pyr = makeCanvas(W, H);
    g = pyr.getContext('2d');
    pyramid(g, 70, 132, 62);
    pyramid(g, 150, 132, 48);
    pyramid(g, 30, 132, 36);
    layers.pyramids = pyr;
    layers.sphinx = bakeSphinx();

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

  function hillsInto(g, fill, edge, base, waves) {
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
  }

  function hills(fill, edge, base, waves) {
    const c = makeCanvas(W, H);
    hillsInto(c.getContext('2d'), fill, edge, base, waves);
    return c;
  }

  function pyramid(g, cx, base, h) {
    for (let y = base - h; y < base; y++) {
      const half = Math.round((y - (base - h)) * 1.25);
      g.fillStyle = '#1b1b24';
      g.fillRect(cx - half - 1, y, half * 2 + 2, 1);
      g.fillStyle = '#ecc27a';
      g.fillRect(cx - half, y, half, 1);
      g.fillStyle = '#c9954a';
      g.fillRect(cx, y, half, 1);
      if ((base - y) % 6 === 0 && half > 2) {
        g.fillStyle = 'rgba(120, 70, 20, 0.35)';
        g.fillRect(cx - half + 1, y, half * 2 - 2, 1);
      }
    }
  }

  // 스핑크스: 왼쪽을 보고 엎드린 사자 몸에 줄무늬 머리 장식 (84×66, 슬라이드를 참고해 새로 그림)
  function bakeSphinx() {
    const c = makeCanvas(84, 66);
    const g = c.getContext('2d');
    const K = '#1b1b24';
    const box = (x, y, w, h, color) => {
      g.fillStyle = K;
      g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
    };
    const round = (cx, cy, r, color) => {
      for (let dy = -r - 1; dy <= r + 1; dy++) {
        const hk = Math.round(Math.sqrt(Math.max(0, (r + 1) * (r + 1) - dy * dy)));
        g.fillStyle = K;
        g.fillRect(cx - hk, cy + dy, hk * 2, 1);
      }
      for (let dy = -r; dy <= r; dy++) {
        const h = Math.round(Math.sqrt(r * r - dy * dy));
        g.fillStyle = color;
        g.fillRect(cx - h, cy + dy, h * 2, 1);
      }
    };
    const sand = '#d9a85a';
    const light = '#ecc27a';
    const dark = '#b98a45';
    round(70, 44, 13, sand); // 뒷다리 엉덩이
    box(30, 36, 50, 26, sand); // 몸통
    g.fillStyle = light;
    g.fillRect(32, 37, 44, 3);
    g.fillStyle = dark;
    g.fillRect(30, 58, 50, 4);
    box(2, 54, 40, 8, sand); // 앞발
    g.fillStyle = K;
    [6, 10, 14].forEach((x) => g.fillRect(x, 58, 1, 4));
    box(20, 30, 20, 26, light); // 가슴
    // 머리 장식 (줄무늬)
    box(8, 8, 32, 30, '#f2c14e');
    g.fillStyle = '#3a5a9a';
    for (let y = 10; y < 38; y += 4) {
      g.fillRect(8, y, 6, 2);
      g.fillRect(34, y, 6, 2);
    }
    g.fillRect(12, 8, 24, 2);
    // 얼굴
    box(14, 12, 20, 22, '#e3b56b');
    g.fillStyle = K;
    g.fillRect(17, 19, 4, 1);
    g.fillRect(27, 19, 4, 1);
    g.fillRect(18, 20, 2, 2);
    g.fillRect(28, 20, 2, 2);
    g.fillRect(23, 21, 1, 5);
    g.fillRect(22, 26, 3, 1);
    g.fillRect(20, 29, 8, 1);
    // 수염 장식
    box(21, 34, 6, 8, '#f2c14e');
    g.fillStyle = '#3a5a9a';
    g.fillRect(21, 37, 6, 1);
    g.fillRect(21, 40, 6, 1);
    return c;
  }

  function house(g, x, base, w, h, roof) {
    const K = '#1b1b24';
    g.fillStyle = K;
    g.fillRect(x - 1, base - h - 1, w + 2, h + 2);
    g.fillStyle = '#f1d6a8';
    g.fillRect(x, base - h, w, h);
    // 지붕
    for (let i = 0; i < 12; i++) {
      g.fillStyle = K;
      g.fillRect(x - 4 + i, base - h - 1 - i, w + 8 - i * 2, 1);
      g.fillStyle = i % 3 === 0 ? '#8f2f20' : roof;
      g.fillRect(x - 3 + i, base - h - 1 - i, w + 6 - i * 2, 1);
    }
    // 창문과 문
    g.fillStyle = K;
    g.fillRect(x + 5, base - h + 6, 7, 7);
    g.fillRect(x + w - 12, base - h + 6, 7, 7);
    g.fillRect(x + w / 2 - 4, base - 12, 8, 12);
    g.fillStyle = '#ffc84a';
    g.fillRect(x + 6, base - h + 7, 5, 5);
    g.fillRect(x + w - 11, base - h + 7, 5, 5);
    g.fillStyle = '#7a4a2a';
    g.fillRect(x + w / 2 - 3, base - 11, 6, 11);
  }

  function cactus(g, x, ground, h) {
    const K = '#1b1b24';
    const box = (bx, by, bw, bh) => {
      g.fillStyle = K;
      g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    };
    box(x, ground - h, 5, h);
    box(x - 5, ground - h + 5, 4, 3);
    box(x - 5, ground - h + 1, 3, 5);
    box(x + 6, ground - h + 8, 4, 3);
    box(x + 8, ground - h + 3, 3, 6);
    g.fillStyle = '#4caf50';
    g.fillRect(x, ground - h, 5, h);
    g.fillRect(x - 5, ground - h + 5, 5, 3);
    g.fillRect(x - 5, ground - h + 1, 3, 5);
    g.fillRect(x + 5, ground - h + 8, 5, 3);
    g.fillRect(x + 8, ground - h + 3, 3, 6);
    g.fillStyle = '#2e7d32';
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
      const f = (y - top) / (bottom - top);
      const w = 4 + Math.round(3 * Math.sin(t * 8 + y * 0.35)) + Math.round(f * 3);
      ctx.fillStyle = colors[0];
      ctx.fillRect(x - w, y, w * 2, 2);
      ctx.fillStyle = colors[1];
      ctx.fillRect(x - w + 2, y, Math.max(0, w * 2 - 4), 2);
      if (w > 4) {
        ctx.fillStyle = colors[2];
        ctx.fillRect(x - 1, y, 2, 2);
      }
    }
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
      hero: { x: 196, y: GROUND },
      D: { x: 158, y: GROUND },
      I: { x: 120, y: GROUND },
      S: { x: 84, y: GROUND },
      C: { x: 46, y: GROUND },
      angel: { x: 360, y: 40, tx: 212, ty: 64, visible: false },
      devil: { x: 252, y: GROUND + 30, ty: GROUND, visible: false, leaving: false },
      mamba: { x: 272, rise: 0, target: 0, visible: false },
    };
    state.partyVisible = true;
    state.partyOffset = 0;
    state.gem = { visible: false, x: 160, y: 62, tx: 160, ty: 62, taken: false };
    state.dark = state.darkTarget = 0;
    state.portal = state.portalTarget = 0;
    state.showcase = null;
    state.sphinx = false;
    state.knocked = false;
    state.battle = null;
    state.compass = { visible: false, x: 0, y: 0, tx: 0, ty: 0 };
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

  // 원작 캐릭터 도트(세로 96칸)를 게임 높이 48로 그린다. 캔버스가 화면 해상도라 칸이 뭉개지지 않는다
  function drawCharacter(img, x, feetY, height = 48) {
    if (!img) return;
    const w = (img.width / img.height) * height;
    ctx.drawImage(img, Math.round((x - w / 2) * 2) / 2, Math.round((feetY - height) * 2) / 2, w, height);
  }

  // 쓰러진 캐릭터: 옆으로 눕혀 바닥에 붙인다 (누우면 그림의 너비가 높이가 된다)
  function drawLying(img, x, height, scale) {
    if (!img) return;
    const h = height || img.height * scale;
    const w = height ? (img.width / img.height) * height : img.width * scale;
    ctx.save();
    ctx.translate(Math.round(x), GROUND - Math.round(w / 2));
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function dizzy(x, y) {
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + (i * Math.PI * 2) / 3;
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(Math.round(x + Math.cos(a) * 8), Math.round(y + Math.sin(a) * 3), 2, 2);
    }
  }

  function drawParty() {
    if (!state.partyVisible) return;
    if (state.knocked) {
      PARTY.forEach((key) => {
        const act = state.actors[key];
        drawLying(Sprites.party[key], act.x, 48);
        dizzy(act.x, GROUND - 26);
      });
      const h = state.actors.hero;
      drawLying(Sprites.frames.hero[0], h.x, 0, 2);
      dizzy(h.x, GROUND - 20);
      return;
    }
    state.partyOffset += (0 - state.partyOffset) * 0.03;
    const off = Math.round(state.partyOffset);
    const walking = state.walking || off < -2;
    const a = state.actors;
    PARTY.forEach((key, i) => {
      const act = a[key];
      const bob = walking ? (Math.floor(t * 6 + i) % 2 ? -1 : 0) : 0;
      drawShadow(act.x + off, GROUND, 12);
      drawCharacter(Sprites.party[key], act.x + off, act.y + bob - hop(key));
    });
    const h = a.hero;
    const frame = walking ? Math.floor(t * 6) % 2 : 0;
    drawShadow(h.x + off, GROUND, 10);
    drawSprite(Sprites.frames.hero[frame], h.x + off, h.y - hop('hero'), 2);
  }

  function drawShadow(x, y, r) {
    ctx.fillStyle = 'rgba(80, 40, 20, 0.25)';
    ctx.fillRect(Math.round(x - r), y - 1, r * 2, 2);
  }

  function drawAngel() {
    const a = state.actors.angel;
    if (!a.visible) return;
    a.x += (a.tx - a.x) * 0.06;
    a.y += (a.ty - a.y) * 0.06;
    const y = a.y + Math.round(Math.sin(t * 3) * 3) - hop('angel');
    const frame = Math.floor(t * 8) % 2;
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

  function drawGem() {
    const g = state.gem;
    if (!g.visible) return;
    if (g.taken) {
      // 블랙맘바 머리를 따라간다
      g.tx = mambaHead.x;
      g.ty = mambaHead.y + 8;
    }
    g.x += (g.tx - g.x) * 0.08;
    g.y += (g.ty - g.y) * 0.08;
    const y = Math.round(g.y + (g.taken ? 0 : Math.sin(t * 2) * 3));
    const x = Math.round(g.x);
    if (!g.taken) {
      const r = 22 + Math.round(Math.sin(t * 3) * 2);
      disc(x, y - 12, r, 'rgba(255, 200, 120, 0.18)');
      disc(x, y - 12, r - 8, 'rgba(255, 220, 160, 0.22)');
      if (Math.random() < 0.3) spark(x + (Math.random() * 40 - 20), y - 12 + (Math.random() * 30 - 15), '#ffe9a8', -0.1);
    }
    drawSprite(Sprites.frames.gem[0], x, y, g.taken ? 1 : 2);
  }

  // 블랙맘바 몸통: 낮은 해상도로 그린 뒤 키워서 도트 크기를 맞춘다
  const snakeBuf = makeCanvas(60, 60);
  const mambaHead = { x: 0, y: 0 };
  const MAMBA_SIZE = 116;

  function circle(g, cx, cy, r) {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      g.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
    }
  }

  function drawMamba() {
    const m = state.actors.mamba;
    if (!m.visible) return;
    m.rise += (m.target - m.rise) * 0.05;
    if (m.target === 0 && m.rise < 0.02) {
      m.visible = false;
      if (state.gem.taken) state.gem.visible = false;
      return;
    }
    const g = snakeBuf.getContext('2d');
    g.clearRect(0, 0, 60, 60);
    const sway = Math.sin(t * 2);
    const back = [];
    const front = [];
    // 바닥의 똬리: 뒤쪽 반원을 먼저, 앞쪽 반원을 나중에 그려 입체감을 준다
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      (Math.sin(a) < 0 ? back : front).push([30 + Math.cos(a) * 14, 52 + Math.sin(a) * 5, 3.6]);
    }
    // 목이 S자로 솟아오르고 끝에서 앞(왼쪽)으로 고개를 내민다
    const neck = [];
    for (let i = 0; i <= 36; i++) {
      const f = i / 36;
      const x = 44 - f * 20 + Math.sin(f * Math.PI * 2) * 7 * (1 - f * 0.4) + sway * f * 2;
      neck.push([x, 52 - f * 40, 3.5 - f * 0.8]);
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
    const head = neck[neck.length - 1];
    const hx = Math.round(head[0]) - 7;
    const hy = Math.round(head[1]) - 5;
    g.drawImage(Sprites.frames.mambaHead[0], hx, hy);
    if (Math.floor(t * 3) % 3 === 0) {
      g.fillStyle = '#e8414f';
      g.fillRect(hx - 2, hy + 5, 2, 1);
      g.fillRect(hx - 3, hy + 4, 1, 1);
      g.fillRect(hx - 3, hy + 6, 1, 1);
    }

    // 전투 장면에서는 다른 자리·크기로 그리고, 맞으면 깜빡이고, 밟히면 납작해진다
    const size = m.size || MAMBA_SIZE;
    const base = m.base || GROUND;
    const scale = size / 60;
    const left = m.x + (m.dx || 0) - size / 2;
    const top = base + 6 - Math.round(size * m.rise) - hop('mamba');
    mambaHead.x = left + (hx + 6) * scale;
    mambaHead.y = top + (hy + 3) * scale;
    if (m.blink > t && Math.floor(t * 16) % 2) return;
    const squash = m.squash || 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, base + 4);
    ctx.clip();
    ctx.drawImage(snakeBuf, left - (size * squash) / 2, top + size * squash * 0.8, size * (1 + squash), size * (1 - squash * 0.8));
    ctx.restore();
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

  // 어둠이 내리면 마을 뒤로 나타나는 탑의 그림자
  function drawTower(alpha) {
    ctx.fillStyle = `rgba(24, 16, 30, ${alpha})`;
    for (let i = 0; i < 7; i++) {
      const w = 44 - i * 5;
      ctx.fillRect(70 - w / 2, 126 - (i + 1) * 13, w, 13);
    }
    ctx.fillStyle = `rgba(255, 170, 60, ${alpha * 0.6})`;
    for (let i = 0; i < 6; i++) ctx.fillRect(64 + (i % 3) * 5, 118 - i * 13, 2, 3);
  }

  // ---------- 파티원 소개 장면: 캐릭터마다 자기 자리(교실, 훈련장, 보건실, 공부방)에서 등장 ----------
  const K = '#1b1b24';

  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function outlined(x, y, w, h, color) {
    rect(x - 1, y - 1, w + 2, h + 2, K);
    rect(x, y, w, h, color);
  }

  function brickWall(top, bottom, base, line) {
    rect(0, top, W, bottom - top, base);
    ctx.fillStyle = line;
    for (let row = 0; top + row * 10 < bottom; row++) {
      const y = top + row * 10;
      ctx.fillRect(0, y + 9, W, 1);
      for (let x = row % 2 ? 12 : 0; x < W; x += 24) ctx.fillRect(x, y, 1, 9);
    }
  }

  // 아이 머리 (소개 장면의 관객, 환자, 학생)
  function kid(x, y, hair, cheer) {
    disc(x, y, 8, K);
    disc(x, y, 7, '#ffd2a8');
    ctx.fillStyle = hair;
    ctx.fillRect(x - 7, y - 7, 14, 5);
    ctx.fillRect(x - 7, y - 3, 3, 3);
    rect(x - 3, y, 2, 2, K);
    rect(x + 2, y, 2, 2, K);
    rect(x - 2, y + 4, 5, 1, '#c0392b');
    if (cheer) {
      const up = Math.floor(t * 4 + x) % 2 ? 2 : 0;
      outlined(x + 9, y - 10 - up, 4, 8, '#ffd2a8');
    }
  }

  const BACKDROPS = {
    // 공감 마법사: 교실에서 친구들을 웃게 한다
    I() {
      brickWall(0, 150, '#f2d7a2', '#e0bd82');
      outlined(18, 22, 70, 64, '#8a5a2e');
      rect(22, 26, 29, 27, '#9fd0ff');
      rect(55, 26, 29, 27, '#9fd0ff');
      rect(22, 56, 29, 27, '#9fd0ff');
      rect(55, 56, 29, 27, '#9fd0ff');
      rect(0, 150, W, 30, '#d9a45a');
      rect(0, 150, W, 1, '#b8843f');
      kid(34, 150, '#3a2a20', true);
      kid(62, 158, '#6b3e1e', true);
      kid(92, 152, '#3a2a20', true);
      kid(290, 156, '#2a2a3a', true);
      if (Math.random() < 0.3) spark(120 + Math.random() * 180, 20 + Math.random() * 40, ['#ff6ad5', '#ffd23f', '#3cf29a'][Math.floor(Math.random() * 3)], 0.3);
    },
    // 불꽃 기사: 훈련장에서 친구들과 훈련한다
    D() {
      rect(0, 0, W, 132, '#fbe7b5');
      [[40, 24], [230, 16], [290, 40]].forEach(([x, y]) => {
        rect(x, y, 30, 6, '#ffffff');
        rect(x + 6, y - 4, 16, 4, '#ffffff');
      });
      rect(0, 132, W, 48, '#7cc05a');
      ctx.fillStyle = '#5a9e3c';
      for (let x = 6; x < W; x += 22) ctx.fillRect(x, 140 + ((x * 7) % 30), 3, 3);
      // 허수아비 훈련 인형
      outlined(58, 96, 4, 58, '#7a4a2a');
      outlined(44, 104, 32, 4, '#7a4a2a');
      disc(60, 110, 13, K);
      disc(60, 110, 12, '#d9b44a');
      disc(60, 86, 9, K);
      disc(60, 86, 8, '#e6c35a');
      rect(56, 84, 2, 2, K);
      rect(62, 84, 2, 2, K);
      // 과녁
      disc(282, 104, 16, K);
      disc(282, 104, 15, '#ffffff');
      disc(282, 104, 10, '#e8414f');
      disc(282, 104, 5, '#ffffff');
      outlined(280, 120, 4, 34, '#7a4a2a');
    },
    // 토닥 힐러: 아픈 친구 곁을 지킨다
    S() {
      brickWall(0, 150, '#f5e3bd', '#ead2a0');
      outlined(24, 18, 44, 38, '#9fc8d8');
      // 벽에 걸린 하트 표지
      disc(40, 34, 6, '#e8414f');
      disc(52, 34, 6, '#e8414f');
      for (let i = 0; i < 9; i++) rect(34 + i, 37 + i, 24 - i * 2, 1, '#e8414f');
      rect(0, 150, W, 30, '#d9b98a');
      // 침대와 누워 있는 친구
      outlined(8, 118, 6, 40, '#8a5a2e');
      outlined(10, 128, 126, 18, '#8a5a2e');
      outlined(16, 112, 28, 14, '#ffffff');
      kid(32, 112, '#3a2a20', false);
      rect(26, 111, 4, 1, K);
      rect(35, 111, 4, 1, K);
      outlined(44, 116, 90, 14, '#7fb3c9');
      // 링거
      outlined(150, 58, 2, 100, K);
      outlined(144, 60, 12, 18, '#cfe8ff');
      rect(145, 68, 10, 9, '#5a9ec9');
      // 반짝이는 회복 효과
      if (Math.random() < 0.25) spark(30 + Math.random() * 20, 100, '#fff6b0', -0.3);
    },
    // AI 전략가: AI 친구와 함께 어려운 문제를 푼다
    C() {
      rect(0, 0, W, 150, '#f6e2b5');
      outlined(14, 16, 140, 80, '#8a5a2e');
      rect(18, 20, 132, 72, '#3b3f3a');
      ctx.fillStyle = '#f5f0e0';
      ctx.font = '12px Galmuri11, monospace';
      ctx.textBaseline = 'top';
      ctx.fillText('x + y = √9  ?', 26, 30);
      ctx.fillRect(26, 50, 42, 1);
      ctx.fillText('2', 42, 56);
      ctx.fillText('★', 120, 70);
      rect(0, 150, W, 30, '#c9a06a');
      // 책상과 책
      outlined(0, 138, 124, 42, '#8a5a2e');
      rect(0, 138, 124, 3, '#a8703a');
      outlined(30, 130, 40, 8, '#ffffff');
      rect(49, 130, 2, 8, '#c9c1a8');
      kid(96, 126, '#6b3e1e', false);
    },
  };

  function drawShowcase() {
    const sc = state.showcase;
    const since = t - sc.at;
    BACKDROPS[sc.key]();
    const pop = Math.min(1, since * 3);
    const h = 100 * (0.75 + 0.25 * pop) + Math.sin(t * 3) * 1.5;
    drawShadow(212, 160, 24);
    drawCharacter(Sprites.party[sc.key], 212, 160 - hop(sc.key), h);
    // 등장 순간 반짝임
    if (since < 0.2) burst(212, 110, CARD_COLORS[sc.key], 6);
  }

  // 황금빛 문: 반짝이가 여행자들을 부르는 입구
  function drawPortal() {
    const p = state.portal;
    if (p < 0.02) return;
    const cx = 40;
    const cy = 104;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 + t * 1.5;
      const x = cx + Math.cos(a) * 18 * p;
      const y = cy + Math.sin(a) * 40 * p;
      ctx.fillStyle = i % 3 ? '#ffc84a' : '#fff3c4';
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    ctx.fillStyle = `rgba(255, 220, 140, ${0.25 * p})`;
    ctx.fillRect(cx - 14 * p, cy - 34 * p, 28 * p, 68 * p);
    if (Math.random() < 0.5) spark(cx + (Math.random() * 30 - 15) * p, cy + (Math.random() * 70 - 35) * p, '#ffe9a8', -0.2);
  }

  const SPHINX_X = 236;

  function drawSphinx() {
    if (!state.sphinx) return;
    const y = GROUND - 66 - hop('sphinx');
    ctx.drawImage(layers.sphinx, SPHINX_X, y);
    // 가끔 눈을 깜빡인다
    if (Math.floor(t * 1.3) % 5 === 0 && (t * 1.3) % 1 < 0.15) {
      ctx.fillStyle = '#e3b56b';
      ctx.fillRect(SPHINX_X + 18, y + 20, 2, 2);
      ctx.fillRect(SPHINX_X + 28, y + 20, 2, 2);
    }
  }

  function drawCompass() {
    const c = state.compass;
    if (!c.visible) return;
    c.x += (c.tx - c.x) * 0.05;
    c.y += (c.ty - c.y) * 0.05;
    const y = Math.round(c.y + Math.sin(t * 3) * 2);
    disc(Math.round(c.x), y - 13, 14, 'rgba(255, 220, 120, 0.25)');
    drawSprite(Sprites.frames.compass[0], c.x, y, 2);
    if (Math.random() < 0.35) spark(c.x + (Math.random() * 24 - 12), y - Math.random() * 26, '#ffe9a8', -0.2);
  }

  function drawDesert() {
    ctx.drawImage(layers.day, 0, 0);
    disc(292, 22, 9, '#fff8d8');
    ctx.drawImage(layers.pyramids, 0, 0);
    ctx.drawImage(layers.dunesNear, 0, 8);
    tile(layers.ground, 0, GROUND);
  }

  // ---------- 전투 장면 (고전 RPG 구도: 적은 오른쪽 위, 우리 편은 왼쪽 아래) ----------
  const BATTLE = { ex: 232, ebase: 84, px: 88, pbase: 170 };

  function platform(cx, cy, rx, ry, top, side) {
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
      ctx.fillStyle = dy < ry - 3 ? top : side;
      ctx.fillRect(cx - half, cy + dy, half * 2, 1);
    }
  }

  function drawBattle() {
    const b = state.battle;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#ffe7b0');
    sky.addColorStop(1, '#f2c27a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // 멀리 보이는 어둠의 탑
    ctx.fillStyle = 'rgba(60, 40, 60, 0.35)';
    for (let i = 0; i < 6; i++) {
      const w = 30 - i * 4;
      ctx.fillRect(150 - w / 2, 70 - (i + 1) * 10, w, 10);
    }
    ctx.fillStyle = '#e8b56a';
    ctx.fillRect(0, 70, W, H - 70);
    ctx.fillStyle = 'rgba(160, 100, 40, 0.25)';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 83) % W, 74 + ((i * 37) % 100), 6, 1);
    platform(BATTLE.ex, BATTLE.ebase, 58, 10, '#c9955a', '#a8783f');
    platform(BATTLE.px, BATTLE.pbase, 70, 12, '#c9955a', '#a8783f');
    drawMamba();
    // 우리 편: 내 캐릭터를 크게, 주인공은 옆에
    const hurt = b.hurt > t && Math.floor(t * 16) % 2;
    const jump = b.jumpAt ? Math.min(1, (t - b.jumpAt) / 0.6) : 0;
    const jx = BATTLE.px + (BATTLE.ex - BATTLE.px) * jump;
    const jy = BATTLE.pbase + (BATTLE.ebase - 6 - BATTLE.pbase) * jump - Math.sin(jump * Math.PI) * 50;
    const lunge = b.lungeAt && t - b.lungeAt < 0.3 ? Math.sin(((t - b.lungeAt) / 0.3) * Math.PI) * 14 : 0;
    if (!hurt) {
      drawShadow(jx - 22, BATTLE.pbase - 2, 16);
      drawSprite(Sprites.frames.hero[Math.floor(t * 3) % 2], jx - 38 + lunge, jy - 2, 2);
      drawCharacter(Sprites.party[b.player], jx + 10 + lunge, jy - 2, 72);
    }
    // 날아가는 카드의 힘
    const p = b.shot;
    if (p) {
      const k = Math.min(1, (t - p.at) / 0.55);
      const x = BATTLE.px + 20 + (BATTLE.ex - BATTLE.px - 20) * k;
      const y = BATTLE.pbase - 50 + (BATTLE.ebase - 40 - (BATTLE.pbase - 50)) * k - Math.sin(k * Math.PI) * 24;
      if (p.type === 'fire') {
        disc(Math.round(x), Math.round(y), 7, '#ff5a3c');
        disc(Math.round(x), Math.round(y), 4, '#ffd23f');
        spark(x, y, '#ff9a3c', 0.2);
      } else if (p.type === 'cloud') {
        disc(Math.round(x), Math.round(y), 8, '#9fb8d8');
        disc(Math.round(x) - 1, Math.round(y) - 1, 7, '#ffffff');
        spark(x, y, '#cfe8ff', 0.1);
      } else {
        disc(Math.round(x), Math.round(y), 7, '#ffd23f');
        spark(x, y, '#fff6b0', 0.2);
      }
      if (k >= 1) {
        b.shot = null;
        state.actors.mamba.blink = t + 0.6;
        const color = p.type === 'fire' ? '#ff9a3c' : p.type === 'cloud' ? '#ffffff' : '#ffd23f';
        burst(BATTLE.ex, BATTLE.ebase - 40, color, p.big ? 26 : 12);
        if (p.big) state.shake = 0.4;
      }
    }
  }

  // ---------- 그리기 루프 ----------
  function tile(img, offset, y = 0) {
    const x = -Math.round(offset % img.width);
    ctx.drawImage(img, x, y);
    ctx.drawImage(img, x + img.width, y);
  }

  function drawWild() {
    ctx.drawImage(layers.day, 0, 0);
    disc(262, 26, 9, '#fff8d8');
    drawCloudPillar(34, 70, 116);
    drawFirePillar(296, 72, 118);
    tile(layers.dunesFar, state.scroll * 0.2);
    tile(layers.dunesNear, state.scroll * 0.45);
    tile(layers.props, state.scroll * 0.8);
    tile(layers.ground, state.scroll, GROUND);
  }

  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    t += dt;
    if (state.walking) state.scroll += dt * 28;
    state.dark += (state.darkTarget - state.dark) * 0.04;
    state.fade += (state.fadeTarget - state.fade) * 0.12;
    state.portal += (state.portalTarget - state.portal) * 0.05;

    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
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
      if (state.scene === 'showcase' && state.showcase) {
        drawShowcase();
      } else {
        if (state.scene === 'battle' && state.battle) drawBattle();
        else if (state.scene === 'village') ctx.drawImage(layers.village, 0, 0);
        else if (state.scene === 'desert') drawDesert();
        else drawWild();
        if (state.dark > 0.01) {
          ctx.fillStyle = `rgba(10, 6, 24, ${state.dark})`;
          ctx.fillRect(0, 0, W, H);
          if (state.scene === 'village') drawTower(Math.min(1, state.dark * 1.8));
        }
        drawPortal();
      }
      if (state.scene !== 'battle') drawMamba();
      drawGem();
      drawSphinx();
      if (state.scene === 'wild' || state.scene === 'desert' || state.scene === 'village') drawParty();
      drawCompass();
      if (state.scene === 'showcase') return endFrame(dt);
      drawDevil();
      drawAngel();
    }
    endFrame(dt);
  }

  function endFrame(dt) {
    drawParticles(dt);
    ctx.restore();
    if (state.fade > 0.01) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, state.fade)})`;
      ctx.fillRect(0, 0, W, H);
    }
    requestAnimationFrame(frame);
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- 다른 파일에서 쓰는 명령 ----------
  window.Game = {
    W,
    H,
    init(el) {
      canvas = el;
      ctx = canvas.getContext('2d');
      this.resize(1);
      bakeLayers();
      resetActors();
      requestAnimationFrame(frame);
    },
    // cssScale: 게임 1픽셀이 화면에서 차지하는 CSS 픽셀 수
    resize(cssScale) {
      k = Math.max(1, Math.round(cssScale * (window.devicePixelRatio || 1)));
      canvas.width = W * k;
      canvas.height = H * k;
    },
    setMode(mode) {
      state.mode = mode;
      if (mode === 'title') {
        resetActors();
        state.walking = true;
        state.particles = [];
      }
    },
    reset(scene = 'wild') {
      resetActors();
      state.scene = scene;
      state.walking = false;
      state.scroll = 0;
      state.particles = [];
      state.focus = null;
      state.mode = 'play';
    },
    // 검은 화면으로 가렸다가 장면을 바꾼다
    async fadeTo(scene) {
      state.fadeTarget = 1.05;
      await wait(450);
      state.scene = scene;
      state.dark = state.darkTarget = 0;
      if (scene === 'battle') {
        state.actors.angel.visible = false;
        state.partyVisible = false;
        state.battle = state.battle || { player: 'D', hurt: 0, shot: null, lungeAt: 0, jumpAt: 0 };
      }
      state.fadeTarget = 0;
      await wait(350);
    },
    // 파티원 한 명 소개 (key: D/I/S/C)
    showcase(key) {
      state.scene = 'showcase';
      state.showcase = { key, at: t };
      Sound.play('sparkle');
    },
    portal(on) {
      state.portalTarget = on ? 1 : 0;
      if (on) Sound.play('sparkle');
    },
    night(on) {
      state.darkTarget = on ? 0.45 : 0;
    },
    walk(on) {
      state.walking = on;
    },
    showSphinx() {
      state.sphinx = true;
      Sound.play('rumble');
      state.shake = 0.5;
    },
    // 스핑크스 머리에서 나침반이 나와 주인공 머리 위로 날아간다
    giveCompass() {
      const h = state.actors.hero;
      state.compass = { visible: true, x: SPHINX_X + 24, y: GROUND - 50, tx: h.x, ty: h.y - 58 };
      Sound.play('powerup');
    },
    knockdown(on) {
      state.knocked = on;
      if (on) {
        state.shake = 0.8;
        state.darkTarget = 0.35;
        Sound.play('rumble');
      } else {
        state.darkTarget = 0;
        PARTY.concat('hero').forEach((k) => burst(state.actors[k].x, GROUND - 20, '#fff6b0', 8));
        Sound.play('powerup');
      }
    },
    // 전투 시작: player는 내 캐릭터 유형(D/I/S/C)
    battleStart(player) {
      state.scene = 'battle';
      state.battle = { player: player || 'D', hurt: 0, shot: null, lungeAt: 0, jumpAt: 0 };
      state.partyVisible = false;
      state.actors.angel.visible = false;
      state.actors.devil.visible = false;
    },
    // 새 블랙맘바가 땅에서 솟아오른다
    enemyEnter() {
      const m = state.actors.mamba;
      Object.assign(m, { visible: true, x: BATTLE.ex, base: BATTLE.ebase, size: 92, rise: 0, target: 1, dx: 0, squash: 0, blink: 0 });
      burst(BATTLE.ex, BATTLE.ebase - 2, '#c9955a', 14);
      Sound.play('rumble');
    },
    enemyAttack() {
      const m = state.actors.mamba;
      const start = t;
      const tick = () => {
        const k = (t - start) / 0.35;
        m.dx = k < 1 ? -Math.sin(k * Math.PI) * 26 : 0;
        if (k < 1) requestAnimationFrame(tick);
      };
      tick();
      state.shake = 0.35;
      state.battle.hurt = t + 0.7;
      Sound.play('poof');
    },
    playerAttack(type, big) {
      state.battle.lungeAt = t;
      state.battle.shot = { type, big, at: t };
      Sound.play(big ? 'powerup' : 'select');
    },
    enemyFaint() {
      state.actors.mamba.target = 0;
      Sound.play('clear');
    },
    // 마지막: 내 캐릭터가 뛰어올라 블랙맘바 머리를 밟는다
    stomp() {
      const m = state.actors.mamba;
      Object.assign(m, { visible: true, x: BATTLE.ex, base: BATTLE.ebase, size: 92, rise: 1, target: 1, dx: 0, squash: 0 });
      state.battle.jumpAt = t;
      setTimeout(() => {
        m.squash = 0.55;
        state.shake = 0.6;
        burst(BATTLE.ex, BATTLE.ebase - 20, '#ffd23f', 30);
        burst(BATTLE.ex, BATTLE.ebase - 20, '#ff6ad5', 16);
        Sound.play('rumble');
      }, 600);
    },
    // 에피소드 6: 블랙맘바가 보석을 쥔 채 마을에 나타난다
    mambaWithGem() {
      const m = state.actors.mamba;
      Object.assign(m, { visible: true, x: 272, base: 0, size: 0, rise: 1, target: 1, dx: 0, squash: 0, blink: 0 });
      state.gem = { visible: true, x: 272, y: 40, tx: 272, ty: 40, taken: true };
      state.darkTarget = 0.5;
    },
    // 약속의 빛: 파티에서 블랙맘바로 빛줄기가 날아간다
    finalBlast() {
      const h = state.actors.hero;
      for (let i = 0; i < 40; i++) {
        setTimeout(() => {
          const k = i / 40;
          const x = h.x + (mambaHead.x - h.x) * k;
          const y = h.y - 30 + (mambaHead.y - (h.y - 30)) * k;
          burst(x, y, i % 2 ? '#fff6b0' : '#ff6ad5', 3, 2);
        }, i * 18);
      }
      setTimeout(() => {
        state.actors.mamba.blink = t + 1;
        state.shake = 0.8;
        burst(mambaHead.x, mambaHead.y, '#ffffff', 30);
      }, 750);
      Sound.play('powerup');
    },
    // 보석이 마을 위 제자리로 돌아오고, 블랙맘바는 사라지고, 마을이 밝아진다
    reclaimGem() {
      state.gem.taken = false;
      state.gem.tx = 160;
      state.gem.ty = 72;
      state.actors.mamba.target = 0;
      state.darkTarget = 0;
      for (let i = 0; i < 6; i++) setTimeout(() => burst(40 + Math.random() * 240, 40 + Math.random() * 60, ['#ffd23f', '#ff6ad5', '#3cf29a'][i % 3], 16), i * 250);
      Sound.play('clear');
    },
    cheerBattle() {
      burst(BATTLE.px, BATTLE.pbase - 60, '#ffd23f', 24);
      burst(BATTLE.ex, BATTLE.ebase - 50, '#3cf29a', 20);
      Sound.play('powerup');
    },
    hideParty() {
      state.partyVisible = false;
    },
    // 파티가 화면 왼쪽 밖에서 걸어 들어온다
    partyEnter() {
      state.partyVisible = true;
      state.partyOffset = -230;
    },
    focus(id) {
      state.focus = id;
      state.focusAt = t;
    },
    showGem() {
      state.gem = { visible: true, x: 160, y: 20, tx: 160, ty: 70, taken: false };
      Sound.play('sparkle');
    },
    stealGem() {
      state.gem.taken = true;
      state.darkTarget = 0.55;
      Sound.play('poof');
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
        const dust = state.scene === 'village' ? '#6d8a4a' : '#e6b877';
        for (let i = 0; i < 4; i++) burst(a.x - 30 + i * 20, GROUND - 1, dust, 10);
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
      if (id === 'mamba') {
        a.target = 0;
        state.shake = 0.8;
        Sound.play('rumble');
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
