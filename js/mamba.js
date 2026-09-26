// 에피소드 4 패널: 블랙맘바 카드게임(마음·생각·행동), 얼마나 자주 나타나는지, 나의 블랙맘바 그리기.
// 카드 데이터는 data/mamba.json. 그림과 직접 쓴 글은 기기에만 저장하고 보내지 않는다.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const MAX_PER_CAT = 3;
  const GRID = 16;
  const COLORS = ['#1b1b24', '#4a4a57', '#caa46a', '#e8414f', '#ffd23f', '#3cf29a', '#5b8cff', '#b06ad0', '#ffffff'];

  let data = null;
  let picked = [];
  let tab = 'heart';
  let freq = {};
  let pixels = [];
  let brush = 0;
  let resolver = null;

  async function load() {
    if (!data) data = await (await fetch('data/mamba.json', { cache: 'no-cache' })).json();
    return data;
  }

  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');
  const card = (id) => data.cards.find((c) => c.id === id);
  const catName = (id) => data.categories.find((c) => c.id === id)[lang()];
  const countIn = (cat) => picked.filter((id) => card(id).category === cat).length;

  function open(id) {
    $(id).hidden = false;
    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  function close(id, value) {
    $(id).hidden = true;
    const r = resolver;
    resolver = null;
    if (r) r(value);
  }

  // ---------- 카드게임 ----------
  function renderTabs() {
    const box = $('#mamba-tabs');
    box.innerHTML = '';
    data.categories.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.setAttribute('aria-pressed', String(c.id === tab));
      const n = countIn(c.id);
      b.innerHTML = `<span></span> <span class="tab-count${n ? ' on' : ''}">${n}</span>`;
      b.firstChild.textContent = c[lang()];
      b.addEventListener('click', () => {
        tab = c.id;
        Sound.play('blip');
        renderGame();
      });
      box.appendChild(b);
    });
  }

  function renderGame() {
    renderTabs();
    const grid = $('#mamba-grid');
    grid.innerHTML = '';
    data.cards
      .filter((c) => c.category === tab)
      .forEach((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mcard';
        b.setAttribute('aria-pressed', String(picked.includes(c.id)));
        b.innerHTML = `<img alt="" loading="lazy" src="${c.img}"><span class="mcard-name"></span><span class="mcard-desc"></span>`;
        b.querySelector('.mcard-name').textContent = c[lang()].name;
        b.querySelector('.mcard-desc').textContent = c[lang()].desc;
        b.addEventListener('click', () => toggle(c.id));
        grid.appendChild(b);
      });
    const n = (cat) => countIn(cat);
    $('#mamba-need').textContent = I18n.t('ep4.need').replace('{h}', n('heart')).replace('{t}', n('thought')).replace('{a}', n('action'));
    $('#mamba-error').hidden = true;
  }

  function toggle(id) {
    const i = picked.indexOf(id);
    if (i >= 0) {
      picked.splice(i, 1);
      Sound.play('blip');
    } else if (countIn(card(id).category) >= MAX_PER_CAT) {
      showError(I18n.t('ep4.full'));
      return;
    } else {
      picked.push(id);
      Sound.play('select');
    }
    const scroll = $('#mamba-grid').scrollTop;
    renderGame();
    $('#mamba-grid').scrollTop = scroll;
  }

  function showError(msg) {
    const e = $('#mamba-error');
    e.textContent = msg;
    e.hidden = false;
    Sound.play('blip');
  }

  function finishGame() {
    const missing = data.categories.filter((c) => !countIn(c.id));
    if (missing.length) {
      tab = missing[0].id;
      renderTabs();
      renderGame();
      showError(I18n.t('ep4.missing').replace('{cats}', missing.map((c) => c[lang()]).join(', ')));
      return;
    }
    close('#mamba-screen', picked.slice());
  }

  // ---------- 얼마나 자주 ----------
  function renderFreq() {
    const box = $('#freq-list');
    box.innerHTML = '';
    picked.forEach((id) => {
      const c = card(id);
      const row = document.createElement('div');
      row.className = 'freq-row';
      row.innerHTML = `<img alt="" src="${c.img}"><div class="freq-info"><div class="freq-name"></div><div class="freq-cat"></div></div><div class="seg freq-seg"></div>`;
      row.querySelector('.freq-name').textContent = c[lang()].name;
      row.querySelector('.freq-cat').textContent = catName(c.category);
      const seg = row.querySelector('.freq-seg');
      [1, 2, 3].forEach((v) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = I18n.t(`ep4.freq${v}`);
        b.setAttribute('aria-pressed', String(freq[id] === v));
        b.addEventListener('click', () => {
          freq[id] = v;
          Sound.play('select');
          $('#freq-error').hidden = true;
          renderFreq();
        });
        seg.appendChild(b);
      });
      box.appendChild(row);
    });
  }

  function finishFreq() {
    if (picked.some((id) => !freq[id])) {
      $('#freq-error').hidden = false;
      return;
    }
    close('#freq-screen', { ...freq });
  }

  // ---------- 그리기 ----------
  // 밑그림: 16×16 칸에 똬리를 튼 뱀 (숫자는 COLORS 번호, '.'은 빈칸)
  const SAMPLE = [
    '................',
    '.....0000.......',
    '....011110......',
    '...01411110.....',
    '...0111111330...',
    '....0111110.....',
    '.....01110......',
    '......0110......',
    '.....01110......',
    '....01110.......',
    '...011100000....',
    '..0111111111100.',
    '.011222222221110',
    '.011111111111110',
    '..0011111111100.',
    '....000000000...',
  ];

  function blank() {
    return Array(GRID * GRID).fill(-1);
  }

  function renderPalette() {
    const box = $('#draw-palette');
    box.innerHTML = '';
    COLORS.concat(['erase']).forEach((col, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      const value = col === 'erase' ? -1 : i;
      b.setAttribute('aria-pressed', String(brush === value));
      if (col === 'erase') {
        b.textContent = I18n.t('ep4.erase');
        b.classList.add('swatch-erase');
      } else {
        b.style.background = col;
        b.setAttribute('aria-label', col);
      }
      b.addEventListener('click', () => {
        brush = value;
        renderPalette();
      });
      box.appendChild(b);
    });
  }

  function paintCanvas() {
    const c = $('#draw-canvas');
    const g = c.getContext('2d');
    const cell = c.width / GRID;
    g.fillStyle = '#fff9ea';
    g.fillRect(0, 0, c.width, c.height);
    pixels.forEach((v, i) => {
      if (v < 0) return;
      g.fillStyle = COLORS[v];
      g.fillRect((i % GRID) * cell, Math.floor(i / GRID) * cell, cell, cell);
    });
    g.strokeStyle = 'rgba(0,0,0,0.08)';
    for (let k = 1; k < GRID; k++) {
      g.beginPath();
      g.moveTo(k * cell, 0);
      g.lineTo(k * cell, c.height);
      g.moveTo(0, k * cell);
      g.lineTo(c.width, k * cell);
      g.stroke();
    }
  }

  function bindCanvas() {
    const c = $('#draw-canvas');
    let down = false;
    const paint = (e) => {
      const r = c.getBoundingClientRect();
      const x = Math.floor(((e.clientX - r.left) / r.width) * GRID);
      const y = Math.floor(((e.clientY - r.top) / r.height) * GRID);
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
      const i = y * GRID + x;
      if (pixels[i] === brush) return;
      pixels[i] = brush;
      paintCanvas();
    };
    c.addEventListener('pointerdown', (e) => {
      down = true;
      c.setPointerCapture(e.pointerId);
      paint(e);
      Sound.play('blip');
    });
    c.addEventListener('pointermove', (e) => {
      if (down) paint(e);
    });
    c.addEventListener('pointerup', () => {
      down = false;
    });
    c.addEventListener('pointercancel', () => {
      down = false;
    });
  }

  function bind() {
    $('#mamba-done').addEventListener('click', finishGame);
    $('#freq-done').addEventListener('click', finishFreq);
    $('#draw-clear').addEventListener('click', () => {
      pixels = blank();
      paintCanvas();
      Sound.play('poof');
    });
    $('#draw-sample').addEventListener('click', () => {
      pixels = SAMPLE.join('').split('').map((ch) => (ch === '.' ? -1 : Number(ch)));
      paintCanvas();
      Sound.play('sparkle');
    });
    $('#draw-done').addEventListener('click', () =>
      close('#draw-screen', {
        pixels: pixels.map((v) => (v < 0 ? '.' : String(v))).join(''),
        name: $('#draw-name').value.trim(),
        says: $('#draw-says').value.trim(),
      })
    );
    bindCanvas();
  }

  window.Mamba = {
    load,
    bind,
    COLORS,
    GRID,
    get data() {
      return data;
    },
    card,
    pick(prev = []) {
      picked = prev.filter((id) => card(id));
      tab = 'heart';
      renderGame();
      $('#mamba-grid').scrollTop = 0;
      return open('#mamba-screen');
    },
    frequency(prev = {}) {
      freq = { ...prev };
      renderFreq();
      $('#freq-error').hidden = true;
      return open('#freq-screen');
    },
    draw(prev) {
      pixels = prev && prev.pixels ? prev.pixels.split('').map((ch) => (ch === '.' ? -1 : Number(ch))) : blank();
      $('#draw-name').value = (prev && prev.name) || '';
      $('#draw-says').value = (prev && prev.says) || '';
      brush = 0;
      renderPalette();
      paintCanvas();
      return open('#draw-screen');
    },
    rerender() {
      if (!data) return;
      if (!$('#mamba-screen').hidden) renderGame();
      if (!$('#freq-screen').hidden) renderFreq();
      if (!$('#draw-screen').hidden) renderPalette();
    },
  };
})();
