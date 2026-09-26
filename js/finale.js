// 에피소드 6: GROW 실천 계획(4단계)과 프로필 카드 완성.
// 프로필 카드는 모든 에피소드의 결과를 한 장의 그림(canvas)으로 그려서 저장·인쇄한다.
// 아이가 직접 쓴 글과 그림은 기기에만 있고 어디에도 보내지 않는다.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const STEPS = ['g', 'r', 'o', 'w'];
  let plan = null;
  let step = 0;
  let resolver = null;

  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');
  const t = (k) => I18n.t(`ep6.${k}`);

  function chip(label, pressed, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(!!pressed));
    b.addEventListener('click', onClick);
    return b;
  }

  // ---------- GROW 단계 ----------
  function renderStep() {
    const s = Data.save;
    const key = STEPS[step];
    $('#grow-step').textContent = t('stepOf').replace('{n}', step + 1);
    $('#grow-title').textContent = t(`${key}Title`);
    $('#grow-sub').textContent = t(`${key}Sub`);
    document.querySelectorAll('.grow-dot').forEach((d, i) => d.classList.toggle('on', i <= step));
    const body = $('#grow-body');
    body.innerHTML = '';
    const area = (field, ph) => {
      const ta = document.createElement('textarea');
      ta.className = 'text-input';
      ta.rows = 3;
      ta.maxLength = 80;
      ta.placeholder = t(ph);
      ta.value = plan[field] || '';
      ta.addEventListener('input', () => {
        plan[field] = ta.value;
      });
      return ta;
    };
    const chips = document.createElement('div');
    chips.className = 'chips';

    if (key === 'g') {
      const ta = area('g', 'gPh');
      body.appendChild(ta);
      I18n.t('ep3.goalExamples').forEach((ex) =>
        chips.appendChild(
          chip(ex, false, () => {
            ta.value = plan.g = ex;
            Sound.play('select');
          })
        )
      );
      body.appendChild(chips);
    }

    if (key === 'r') {
      const ta = area('r', 'rPh');
      body.appendChild(ta);
      const mambas = (s.ep4 && s.ep4.cards) || [];
      mambas.forEach((id) => {
        const m = Mamba.card(id);
        chips.appendChild(
          chip(`🐍 ${m[lang()].name}`, false, () => {
            ta.value = plan.r = (ta.value ? `${ta.value}, ` : '') + m[lang()].desc;
            Sound.play('select');
          })
        );
      });
      body.appendChild(chips);
    }

    if (key === 'o') {
      const results = (s.ep5 && s.ep5.results) || [];
      const ids = [...new Set(results.map((r) => r.card))];
      ids.forEach((id) => {
        const c = Battle.card(id);
        chips.appendChild(
          chip(`${c.type === 'fire' ? '🔥' : c.type === 'cloud' ? '☁' : '⭐'} ${c[lang()].name}`, plan.o.includes(id), () => {
            plan.o = plan.o.includes(id) ? plan.o.filter((x) => x !== id) : plan.o.concat(id);
            Sound.play('select');
            renderStep();
          })
        );
      });
      body.appendChild(chips);
      body.appendChild(area('oText', 'oPh'));
    }

    if (key === 'w') {
      const row = (labelKey, opts, field) => {
        const wrap = document.createElement('div');
        wrap.className = 'grow-row';
        const label = document.createElement('div');
        label.className = 'field-label';
        label.textContent = t(labelKey);
        const c = document.createElement('div');
        c.className = 'chips';
        I18n.t(`ep6.${opts}`).forEach((o, i) =>
          c.appendChild(
            chip(o, plan[field] === i, () => {
              plan[field] = plan[field] === i ? null : i;
              Sound.play('select');
              $('#grow-error').hidden = true;
              renderStep();
            })
          )
        );
        wrap.append(label, c);
        return wrap;
      };
      body.appendChild(row('when', 'whenOpts', 'when'));
      body.appendChild(row('howLong', 'longOpts', 'long'));
      const label = document.createElement('div');
      label.className = 'field-label';
      label.textContent = t('what');
      body.appendChild(label);
      const ta = area('what', 'whatPh');
      ta.rows = 2;
      ta.addEventListener('input', () => ($('#grow-error').hidden = true));
      body.appendChild(ta);
      const cl = document.createElement('div');
      cl.className = 'field-label grow-cheer-label';
      cl.textContent = t('cheerTitle');
      body.appendChild(cl);
      const cc = document.createElement('div');
      cc.className = 'chips';
      I18n.t('ep6.cheers').forEach((c, i) =>
        cc.appendChild(
          chip(`✨ ${c}`, plan.cheer === i, () => {
            plan.cheer = i;
            Sound.play('sparkle');
            renderStep();
          })
        )
      );
      body.appendChild(cc);
    }

    $('#grow-prev').hidden = step === 0;
    $('#grow-next').textContent = step === STEPS.length - 1 ? t('stamp') : t('next');
  }

  function next() {
    if (STEPS[step] === 'w' && !String(plan.what || '').trim() && plan.when === null) {
      $('#grow-error').hidden = false;
      Sound.play('blip');
      return;
    }
    if (step < STEPS.length - 1) {
      step++;
      Sound.play('select');
      renderStep();
      $('#grow-screen').scrollTop = 0;
      return;
    }
    $('#grow-screen').hidden = true;
    const r = resolver;
    resolver = null;
    if (r) r({ ...plan });
  }

  // ---------- 프로필 카드 그림 ----------
  const CW = 1200;
  const CH_MAX = 2000; // 넉넉하게 그린 뒤 내용 높이에 맞춰 자른다
  const COLORS = { D: '#dc143c', I: '#6fa84a', S: '#e0b400', C: '#0070c0' };

  function loadImg(src) {
    return new Promise((resolve) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = src;
    });
  }

  // 글자를 폭에 맞춰 줄바꿈해 그리고, 쓴 높이를 돌려준다
  function wrap(g, text, x, y, maxW, lineH, maxLines = 4) {
    const words = String(text || '').split(/(\s+)/);
    let line = '';
    let lines = 0;
    const flush = (l) => {
      g.fillText(l.trim(), x, y + lines * lineH);
      lines++;
    };
    for (const w of words) {
      // 띄어쓰기 없는 긴 한글은 글자 단위로 자른다
      const pieces = g.measureText(w).width > maxW ? w.split('') : [w];
      for (const p of pieces) {
        if (g.measureText(line + p).width > maxW && line.trim()) {
          if (lines === maxLines - 1) {
            flush(`${line.trim()}…`);
            return lines * lineH;
          }
          flush(line);
          line = p.trimStart();
        } else line += p;
      }
    }
    if (line.trim()) flush(line);
    return lines * lineH;
  }

  function box(g, x, y, w, h, fill, stroke, r = 18) {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fillStyle = fill;
    g.fill();
    if (stroke) {
      g.lineWidth = 4;
      g.strokeStyle = stroke;
      g.stroke();
    }
  }

  function heading(g, text, x, y, color) {
    g.fillStyle = color;
    g.font = 'bold 34px Galmuri11, sans-serif';
    g.fillText(text, x, y);
  }

  async function renderCard() {
    const s = Data.save;
    const L = lang();
    const d = s.disc || { primary: 'D', secondary: 'I' };
    const main = Card.local(d.primary);
    const sub = Card.local(d.secondary);
    const color = COLORS[d.primary];
    await document.fonts.load('bold 30px Galmuri11');
    await document.fonts.load('26px Galmuri11');

    const c = document.createElement('canvas');
    c.width = CW;
    c.height = CH_MAX;
    const g = c.getContext('2d');
    g.textBaseline = 'top';

    // 바탕 (테두리는 높이가 정해진 뒤 마지막에 그린다)
    g.fillStyle = '#fff9ee';
    g.fillRect(0, 0, CW, CH_MAX);
    g.fillStyle = color;
    g.fillRect(24, 24, CW - 48, 150);
    g.fillStyle = '#ffffff';
    g.font = '26px Galmuri11, sans-serif';
    g.fillText("I'M ON THE NEXT LEVEL IN EDUCATION", 64, 54);
    g.font = 'bold 54px Galmuri11, sans-serif';
    g.fillText(t('c_title').replace('{name}', Data.nameText()), 64, 94);

    // 캐릭터
    box(g, 64, 210, 470, 560, color, '#1b1b24', 24);
    box(g, 88, 290, 422, 400, '#ffffff', null, 12);
    const sprite = await loadImg(`assets/sprites/${d.primary.toLowerCase()}.png`);
    if (sprite) {
      g.imageSmoothingEnabled = false;
      const h = 370;
      const w = (sprite.width / sprite.height) * h;
      g.drawImage(sprite, 299 - w / 2, 305, w, h);
    }
    g.fillStyle = '#ffffff';
    g.font = 'bold 40px Galmuri11, sans-serif';
    g.textAlign = 'center';
    g.fillText(I18n.t('card.type').replace('{code}', d.primary), 299, 232);
    g.fillText(main.job, 299, 706);
    g.textAlign = 'left';

    // 오른쪽: 능력치
    let y = 214;
    const rx = 570;
    const rw = CW - rx - 64;
    const stat = (label, value) => {
      g.fillStyle = color;
      g.font = 'bold 28px Galmuri11, sans-serif';
      g.fillText(label, rx, y);
      g.fillStyle = '#1b1b24';
      g.font = '28px Galmuri11, sans-serif';
      y += 38 + wrap(g, value, rx, y + 38, rw, 36, 2) + 14;
    };
    stat(I18n.t('card.strengths'), main.strengths.join(', '));
    stat(I18n.t('card.element'), `${main.element.icon} ${main.element.name}   ·   ${I18n.t('card.weapon')}: ${main.weapon}`);
    stat(I18n.t('card.growth'), main.growthKeywords.join(', '));
    stat(t('c_sub'), sub.job);
    const e3 = s.ep3 || {};
    const energy = e3.energy === 'passion' ? t('c_passion') : e3.energy === 'reward' ? t('c_reward') : e3.energy === 'both' ? t('c_both') : t('c_none');
    stat(t('c_energy'), energy);
    const gauges = Energy.data ? (e3.top || []).map((id) => Energy.data.gauges.find((x) => x.id === id)[L].name).join(', ') : '';
    stat(t('c_gauge'), gauges || t('c_none'));
    g.fillStyle = '#6b6b80';
    g.font = '24px Galmuri11, sans-serif';
    const codeY = Math.max(y, 740);
    g.fillText(`${I18n.t('card.code')}: ${Data.codeText()}`, rx, codeY);

    // 나의 블랙맘바 (위 칸이 길어지면 그만큼 아래로 내린다)
    const top2 = Math.max(810, codeY + 60);
    y = top2;
    heading(g, `🐍 ${t('c_mamba')}`, 64, y, '#c24a2c');
    box(g, 64, y + 50, 330, 330, '#fff', '#c24a2c', 16);
    const dr = s.ep4 && s.ep4.drawing;
    if (dr && dr.pixels) {
      const cell = 300 / Mamba.GRID;
      dr.pixels.split('').forEach((ch, i) => {
        if (ch === '.') return;
        g.fillStyle = Mamba.COLORS[Number(ch)];
        g.fillRect(79 + (i % Mamba.GRID) * cell, y + 65 + Math.floor(i / Mamba.GRID) * cell, cell + 0.5, cell + 0.5);
      });
    }
    g.fillStyle = '#1b1b24';
    g.font = 'bold 30px Galmuri11, sans-serif';
    let my = y + 60;
    if (dr && dr.name) {
      g.fillText(dr.name, 420, my);
      my += 44;
    }
    if (dr && dr.says) {
      g.font = '26px Galmuri11, sans-serif';
      g.fillStyle = '#6b3a2a';
      my += wrap(g, `"${dr.says}"`, 420, my, 300, 34, 3) + 12;
    }
    g.font = '24px Galmuri11, sans-serif';
    g.fillStyle = '#444';
    const mnames = ((s.ep4 && s.ep4.cards) || []).map((id) => Mamba.card(id)[L].name).join(', ');
    wrap(g, mnames, 420, my, 300, 32, 5);

    // 나만의 전략
    heading(g, `☁🔥 ${t('c_strategy')}`, 760, y, '#2f6fd0');
    let sy = y + 56;
    for (const r of (s.ep5 && s.ep5.results) || []) {
      const sc = Battle.card(r.card);
      const img = await loadImg(sc.img);
      box(g, 760, sy, 376, 100, '#eef4ff', '#5b8cff', 12);
      if (img) g.drawImage(img, 770, sy + 10, 100, 80);
      g.fillStyle = '#1b1b24';
      g.font = 'bold 24px Galmuri11, sans-serif';
      wrap(g, sc[L].name, 882, sy + 14, 244, 30, 2);
      g.fillStyle = '#6b6b80';
      g.font = '20px Galmuri11, sans-serif';
      g.fillText(`vs ${Mamba.card(r.mamba)[L].name}`, 882, sy + 72);
      sy += 112;
    }

    // GROW
    y = top2 + 420;
    heading(g, `🧭 ${t('c_grow')}`, 64, y, '#1b7a4f');
    const p = s.ep6 || {};
    const rowY = y + 54;
    const cols = [
      ['G', p.g],
      ['R', p.r],
      ['O', [((p.o || []).map((id) => Battle.card(id)[L].name).join(', ')), p.oText].filter(Boolean).join(' / ')],
      [
        'W',
        [p.when != null ? I18n.t('ep6.whenOpts')[p.when] : '', p.long != null ? I18n.t('ep6.longOpts')[p.long] : '', p.what || '']
          .filter(Boolean)
          .join(' · '),
      ],
    ];
    const cw = (CW - 128 - 36) / 4;
    cols.forEach(([k, v], i) => {
      const x = 64 + i * (cw + 12);
      box(g, x, rowY, cw, 250, '#effaf3', '#3cc26a', 14);
      g.fillStyle = '#1b7a4f';
      g.font = 'bold 44px Galmuri11, sans-serif';
      g.fillText(k, x + 18, rowY + 14);
      g.fillStyle = '#1b1b24';
      g.font = '24px Galmuri11, sans-serif';
      wrap(g, v || t('c_none'), x + 18, rowY + 72, cw - 36, 32, 5);
    });

    // 응원과 날짜
    const cheer = p.cheer != null ? I18n.t('ep6.cheers')[p.cheer] : '';
    const cy = rowY + 280;
    box(g, 64, cy, CW - 128, 84, '#fff3c4', '#e0a92e', 42);
    const gem = Sprites.frames.gem[0];
    g.imageSmoothingEnabled = false;
    g.drawImage(gem, 88, cy + 10, 48, 52);
    g.fillStyle = '#7a4a00';
    g.font = 'bold 30px Galmuri11, sans-serif';
    g.fillText(`${t('c_cheer')}: ${cheer || '✨'}`, 152, cy + 26);
    g.font = '22px Galmuri11, sans-serif';
    g.textAlign = 'right';
    g.fillStyle = '#9a7a40';
    const date = new Date(p.at || Date.now()).toLocaleDateString(L === 'en' ? 'en-US' : 'ko-KR');
    g.fillText(`${t('c_date')} ${date}`, CW - 92, cy + 32);
    g.textAlign = 'left';
    g.fillStyle = '#b0a080';
    g.font = '18px Galmuri11, sans-serif';
    g.fillText('© 2025 김윤호 · 문성혜', 64, cy + 104);

    // 내용 높이에 맞춰 자르고 바깥 테두리를 그린다
    const ch = cy + 150;
    const out = document.createElement('canvas');
    out.width = CW;
    out.height = ch;
    const o = out.getContext('2d');
    o.fillStyle = '#fff6e3';
    o.fillRect(0, 0, CW, ch);
    o.save();
    o.beginPath();
    o.roundRect(24, 24, CW - 48, ch - 48, 36);
    o.clip();
    o.drawImage(c, 0, 0);
    o.restore();
    o.lineWidth = 6;
    o.strokeStyle = color;
    o.beginPath();
    o.roundRect(24, 24, CW - 48, ch - 48, 36);
    o.stroke();
    return out;
  }

  let cardURL = '';
  let cardResolve = null;

  async function showCard() {
    $('#card-screen').hidden = false;
    $('#card-img').removeAttribute('src');
    const c = await renderCard();
    const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
    if (cardURL) URL.revokeObjectURL(cardURL);
    cardURL = URL.createObjectURL(blob);
    $('#card-img').src = cardURL;
    $('#print-img').src = cardURL;
  }

  window.Finale = {
    bind() {
      $('#grow-prev').addEventListener('click', () => {
        if (step > 0) step--;
        Sound.play('blip');
        renderStep();
      });
      $('#grow-next').addEventListener('click', next);
      $('#card-save').addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = cardURL;
        a.download = `next-level-card-${Data.save.code.n}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        Sound.play('select');
        Data.send('card_saved');
      });
      $('#card-print').addEventListener('click', () => {
        Sound.play('select');
        window.print();
      });
      $('#card-close').addEventListener('click', () => {
        $('#card-screen').hidden = true;
        const r = cardResolve;
        cardResolve = null;
        if (r) r();
      });
    },
    grow(prev = {}) {
      const e3 = Data.save.ep3 || {};
      plan = { g: e3.goal || '', r: '', o: [], oText: '', when: null, long: null, what: '', cheer: 0, ...prev };
      step = 0;
      $('#grow-error').hidden = true;
      renderStep();
      $('#grow-screen').hidden = false;
      return new Promise((resolve) => {
        resolver = resolve;
      });
    },
    showCard() {
      showCard();
      return new Promise((resolve) => {
        cardResolve = resolve;
      });
    },
    renderCard,
    rerender() {
      if (!$('#grow-screen').hidden) renderStep();
      if (!$('#card-screen').hidden) showCard();
    },
  };
})();
