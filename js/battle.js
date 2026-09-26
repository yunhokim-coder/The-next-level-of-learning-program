// 에피소드 5 전투: 블랙맘바가 공격하면 구름기둥·불기둥 카드를 골라 맞선다 (고전 RPG 턴제 구도).
// 카드의 tags가 블랙맘바의 tags와 겹치면 '효과가 굉장했다!'(2칸), 아니면 '효과가 있었다!'(1칸).
// 지는 경우는 없다. 힘이 바닥나기 전에 반짝이가 채워 준다.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const ENEMY_HP = 3;
  const PLAYER_HP = 4;
  const HAND = 4;

  let strategy = null;
  let state = null;
  let pickResolve = null;

  async function load() {
    if (!strategy) strategy = await (await fetch('data/strategy.json', { cache: 'no-cache' })).json();
    return strategy;
  }

  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');
  const scard = (id) => strategy.cards.find((c) => c.id === id);
  const effective = (s, m) => s.tags.some((tag) => m.tags.includes(tag));
  const shuffle = (a) => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };

  // ---------- 체력 상자 ----------
  function renderHud() {
    if (!state) return;
    const m = state.enemy;
    $('#bh-enemy-img').src = m ? m.img : '';
    $('#bh-enemy-name').textContent = m ? m[lang()].name : '';
    $('#bh-enemy-bar').style.width = `${(state.enemyHp / ENEMY_HP) * 100}%`;
    $('#bh-enemy-bar').classList.toggle('low', state.enemyHp <= 1);
    $('#bh-player-name').textContent = I18n.t(`names.${state.player}`);
    $('#bh-player-bar').style.width = `${(state.playerHp / PLAYER_HP) * 100}%`;
    $('#bh-player-bar').classList.toggle('low', state.playerHp <= 1);
    $('#bh-player-hp').textContent = `${state.playerHp} / ${PLAYER_HP}`;
  }

  // ---------- 카드 고르기 ----------
  // 손패 4장: 잘 통하는 카드 2장 + 나머지 2장을 섞는다
  function deal() {
    const m = state.enemy;
    const good = shuffle(strategy.cards.filter((c) => effective(c, m)));
    const rest = shuffle(strategy.cards.filter((c) => !effective(c, m)));
    state.hand = shuffle(good.slice(0, 2).concat(rest.slice(0, HAND - 2))).map((c) => c.id);
    state.hintShown = false;
  }

  function renderHand() {
    const box = $('#hand-cards');
    box.innerHTML = '';
    state.hand.forEach((id) => {
      const c = scard(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `hcard hcard-${c.type}`;
      b.innerHTML = `<img alt="" src="${c.img}"><span class="hcard-type"></span><span class="hcard-name"></span><span class="hcard-desc"></span>`;
      b.querySelector('.hcard-type').textContent = `${c.type === 'fire' ? '🔥' : c.type === 'cloud' ? '☁' : '⭐'} ${I18n.t(`ep5.type_${c.type}`)}`;
      b.querySelector('.hcard-name').textContent = c[lang()].name;
      b.querySelector('.hcard-desc').textContent = c[lang()].desc;
      b.addEventListener('click', () => {
        Sound.play('select');
        $('#hand').hidden = true;
        document.body.classList.remove('hand-open');
        const r = pickResolve;
        pickResolve = null;
        if (r) r(id);
      });
      box.appendChild(b);
    });
    const hint = $('#hand-hint-text');
    hint.hidden = !state.hintShown;
    if (state.hintShown) {
      const names = state.enemy.tags.map((tag) => strategy.tags[tag][lang()]).join(', ');
      hint.textContent = I18n.t('ep5.tagHint').replace('{tags}', names);
    }
  }

  function chooseCard() {
    deal();
    renderHand();
    $('#dialog').hidden = true;
    $('#hand').hidden = false;
    document.body.classList.add('hand-open');
    return new Promise((resolve) => {
      pickResolve = resolve;
    });
  }

  const say = (steps) => Story.play(steps);

  // ---------- 한 판 ----------
  async function fight(m, isLast) {
    state.enemy = m;
    state.enemyHp = ENEMY_HP;
    renderHud();
    const mv = () => ({ mamba: m[lang()].name, desc: m[lang()].desc, hero: I18n.t(`names.${state.player}`) });
    await say([{ who: 'narrator', key: 'ep5.appear', vars: mv, do: () => Game.enemyEnter(), wait: 1300 }]);
    let best = null;
    const used = [];
    while (state.enemyHp > 0) {
      await say([{ who: 'mamba', key: 'ep5.attack', vars: mv, do: () => Game.enemyAttack() }]);
      state.playerHp = Math.max(1, state.playerHp - 1);
      renderHud();
      await say([{ who: 'narrator', key: 'ep5.ouch', vars: mv }]);
      if (state.playerHp <= 1) {
        state.playerHp = PLAYER_HP;
        renderHud();
        await say([{ who: 'angel', key: 'ep5.heal', do: () => Game.cheer() }]);
      }
      const id = await chooseCard();
      const c = scard(id);
      const sup = effective(c, m);
      used.push(id);
      if (sup) best = id;
      await say([
        { who: 'narrator', key: 'ep5.use', vars: () => ({ ...mv(), card: c[lang()].name }), do: () => Game.playerAttack(c.type, sup), wait: 900 },
      ]);
      state.enemyHp = Math.max(0, state.enemyHp - (sup ? 2 : 1));
      renderHud();
      await say([{ who: 'narrator', key: sup ? 'ep5.super' : 'ep5.normal' }]);
    }
    const win = best || used[used.length - 1];
    if (!isLast) {
      Game.enemyFaint();
      await say([
        { who: 'narrator', key: 'ep5.win', vars: mv, wait: 400 },
        { who: 'narrator', key: 'ep5.exp', vars: () => ({ card: scard(win)[lang()].name }) },
        { who: 'narrator', key: 'ep5.next' },
      ]);
    } else {
      await say([
        { who: 'narrator', key: 'ep5.win', vars: mv },
        { who: 'narrator', key: 'ep5.exp', vars: () => ({ card: scard(win)[lang()].name }) },
      ]);
    }
    return { mamba: m.id, card: win, used, super: !!best };
  }

  // ---------- 나만의 학업 전략 요약 ----------
  function renderSummary() {
    const box = $('#strategy-list');
    box.innerHTML = '';
    state.results.forEach((r) => {
      const m = Mamba.card(r.mamba);
      const c = scard(r.card);
      const row = document.createElement('div');
      row.className = 'strat-row';
      row.innerHTML = `
        <div class="strat-side"><img alt="" src="${m.img}"><span class="strat-name"></span></div>
        <div class="strat-arrow">▶</div>
        <div class="strat-side"><img alt="" src="${c.img}"><span class="strat-name"></span><span class="strat-desc"></span></div>`;
      row.querySelectorAll('.strat-name')[0].textContent = m[lang()].name;
      row.querySelectorAll('.strat-name')[1].textContent = c[lang()].name;
      row.querySelector('.strat-desc').textContent = c[lang()].desc;
      box.appendChild(row);
    });
  }

  let summaryResolve = null;

  window.Battle = {
    load,
    card: scard,
    get data() {
      return strategy;
    },
    bind() {
      $('#hand-reshuffle').addEventListener('click', () => {
        Sound.play('blip');
        const hint = state.hintShown;
        deal();
        state.hintShown = hint;
        renderHand();
      });
      $('#hand-hint').addEventListener('click', () => {
        Sound.play('sparkle');
        state.hintShown = true;
        renderHand();
      });
      $('#strategy-done').addEventListener('click', () => {
        $('#strategy-screen').hidden = true;
        const r = summaryResolve;
        summaryResolve = null;
        if (r) r();
      });
    },
    // opponents: 블랙맘바 카드 목록, player: 내 캐릭터 유형
    async run(opponents, player) {
      state = { player, playerHp: PLAYER_HP, enemy: null, enemyHp: ENEMY_HP, hand: [], results: [] };
      Game.battleStart(player);
      $('#bhud').hidden = false;
      renderHud();
      for (let i = 0; i < opponents.length; i++) {
        state.results.push(await fight(opponents[i], i === opponents.length - 1));
      }
      return state.results;
    },
    hideHud() {
      $('#bhud').hidden = true;
      $('#hand').hidden = true;
      document.body.classList.remove('hand-open');
    },
    summary(results) {
      state = state || {};
      state.results = results;
      renderSummary();
      $('#strategy-screen').hidden = false;
      Sound.play('clear');
      return new Promise((resolve) => {
        summaryResolve = resolve;
      });
    },
    rerender() {
      if (!strategy || !state) return;
      renderHud();
      if (!$('#hand').hidden) renderHand();
      if (!$('#strategy-screen').hidden) renderSummary();
    },
  };
})();
