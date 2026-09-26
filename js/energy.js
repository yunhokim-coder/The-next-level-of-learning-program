// 에피소드 3 패널: 마음 게이지 소개, 체크리스트(나도 그래!), 에너지 스티커 결과, 나침반이 가리키는 목표.
// 문항과 게이지 연결은 data/energy.json.
(function () {
  const $ = (sel) => document.querySelector(sel);
  let data = null;
  let checks = [];
  let lastResult = null;
  let resolver = null;

  async function load() {
    if (!data) data = await (await fetch('data/energy.json', { cache: 'no-cache' })).json();
    return data;
  }

  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');
  const gauge = (id) => data.gauges.find((g) => g.id === id);

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

  // ---------- 마음 게이지 피라미드 ----------
  function renderGauges() {
    const box = $('#gauge-list');
    box.innerHTML = '';
    data.gauges.forEach((g, i) => {
      const t = g[lang()];
      const row = document.createElement('div');
      row.className = 'gauge-row';
      row.style.setProperty('--w', `${64 + i * 9}%`);
      row.innerHTML = `<img alt="" src="${Sprites.iconURL(g.icon)}"><div><div class="gauge-name"></div><div class="gauge-full"></div><div class="gauge-low"></div></div>`;
      row.querySelector('.gauge-name').textContent = t.name;
      row.querySelector('.gauge-full').textContent = t.full;
      row.querySelector('.gauge-low').textContent = t.low;
      box.appendChild(row);
    });
  }

  // ---------- 체크리스트 ----------
  function renderChecklist() {
    const box = $('#check-list');
    box.innerHTML = '';
    data.checklist.forEach((item, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'check';
      b.setAttribute('aria-pressed', String(!!checks[i]));
      b.innerHTML = `<span class="check-box" aria-hidden="true"></span><span class="check-text"></span>`;
      b.querySelector('.check-text').textContent = item[lang()];
      b.addEventListener('click', () => {
        checks[i] = !checks[i];
        b.setAttribute('aria-pressed', String(checks[i]));
        Sound.play(checks[i] ? 'select' : 'blip');
        renderCount();
      });
      box.appendChild(b);
    });
    renderCount();
  }

  function renderCount() {
    const n = checks.filter(Boolean).length;
    $('#check-count').textContent = I18n.t('ep3.checkCount').replace('{n}', n);
  }

  // 게이지마다 고른 문항 수 / 전체 문항 수. 비율이 가장 높은 게이지가 나에게 특히 중요한 게이지
  function score(c) {
    const out = {};
    data.gauges.forEach((g) => {
      out[g.id] = { picked: 0, total: 0 };
    });
    data.checklist.forEach((item, i) => {
      out[item.gauge].total += 1;
      if (c[i]) out[item.gauge].picked += 1;
    });
    const ratio = (id) => (out[id].total ? out[id].picked / out[id].total : 0);
    const best = Math.max(...data.gauges.map((g) => ratio(g.id)));
    const top = best > 0 ? data.gauges.filter((g) => ratio(g.id) === best).map((g) => g.id) : [];
    return { gauges: out, top };
  }

  // ---------- 에너지 스티커 결과 ----------
  function renderResult() {
    if (!lastResult) return;
    const box = $('#sticker-list');
    box.innerHTML = '';
    data.gauges.forEach((g) => {
      const r = lastResult.gauges[g.id];
      const row = document.createElement('div');
      row.className = `sticker-row${lastResult.top.includes(g.id) ? ' is-top' : ''}`;
      const icons = Array.from({ length: r.total }, (_, i) => `<img alt="" class="${i < r.picked ? 'on' : 'off'}" src="${Sprites.iconURL(g.icon)}">`).join('');
      row.innerHTML = `<div class="sticker-name"></div><div class="sticker-icons">${icons}</div><div class="sticker-count"></div>`;
      row.querySelector('.sticker-name').textContent = g[lang()].name;
      row.querySelector('.sticker-count').textContent = I18n.t('ep3.stickers').replace('{n}', r.picked);
      box.appendChild(row);
    });
    const names = lastResult.top.map((id) => gauge(id)[lang()].name).join(', ');
    $('#sticker-msg').textContent = lastResult.top.length ? I18n.t('ep3.resultTop').replace('{names}', names) : I18n.t('ep3.resultNone');
  }

  // ---------- 목표 ----------
  function renderGoalExamples() {
    const box = $('#goal-examples');
    box.innerHTML = '';
    I18n.t('ep3.goalExamples').forEach((ex) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = ex;
      b.addEventListener('click', () => {
        $('#goal-input').value = ex;
        Sound.play('select');
      });
      box.appendChild(b);
    });
  }

  function bind() {
    $('#gauge-ok').addEventListener('click', () => close('#gauge-screen'));
    $('#check-done').addEventListener('click', () => close('#check-screen', checks.slice()));
    $('#sticker-next').addEventListener('click', () => close('#sticker-screen'));
    $('#goal-done').addEventListener('click', () => close('#goal-screen', $('#goal-input').value.trim()));
    $('#goal-skip').addEventListener('click', () => close('#goal-screen', ''));
  }

  window.Energy = {
    load,
    bind,
    get data() {
      return data;
    },
    showGauges() {
      renderGauges();
      return open('#gauge-screen');
    },
    checklist() {
      checks = data.checklist.map(() => false);
      renderChecklist();
      return open('#check-screen');
    },
    score,
    showResult(result) {
      lastResult = result;
      renderResult();
      Sound.play('clear');
      return open('#sticker-screen');
    },
    goal(current = '') {
      $('#goal-input').value = current;
      renderGoalExamples();
      const p = open('#goal-screen');
      $('#goal-input').focus();
      return p;
    },
    // 언어를 바꾸면 열려 있는 패널을 다시 그린다
    rerender() {
      if (!data) return;
      if (!$('#gauge-screen').hidden) renderGauges();
      if (!$('#check-screen').hidden) renderChecklist();
      if (!$('#sticker-screen').hidden) renderResult();
      if (!$('#goal-screen').hidden) renderGoalExamples();
    },
  };
})();
