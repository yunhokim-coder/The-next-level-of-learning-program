// 화면 흐름: 언어 선택 → 타이틀 → 여행자 등록 → 모험 지도 → 에피소드.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const stage = $('#stage');
  const titleEl = $('#title');
  const menu = $('#menu');
  const VIDEO_ID = 'bZFApTvrVVQ';
  const READY_EPISODES = [1, 2]; // 지금 플레이할 수 있는 에피소드
  const MIN_AGE = 7;
  const MAX_AGE = 80;
  const OVERLAYS = ['#lang-screen', '#setup-screen', '#map-screen', '#quiz-screen', '#tie-screen', '#result-screen', '#clear-screen', '#video-modal'];

  // ---------- 화면 크기: 320×180을 정수배로 확대 (작은 화면에서는 꽉 차게) ----------
  function fit() {
    const portrait = window.innerHeight > window.innerWidth;
    document.body.classList.toggle('portrait', portrait);
    // 가로 화면에서는 그림 아래 대화창 자리(게임 픽셀 46줄)까지 함께 들어가게 맞춘다
    const raw = portrait
      ? Math.min(window.innerWidth / Game.W, (window.innerHeight * 0.6) / Game.H)
      : Math.min(window.innerWidth / Game.W, window.innerHeight / (Game.H + 46));
    const scale = raw >= 2 ? Math.floor(raw) : raw;
    const w = Math.floor(Game.W * scale);
    stage.style.width = `${w}px`;
    stage.style.height = `${Math.floor(Game.H * scale)}px`;
    $('#app').style.width = `${w}px`;
    document.documentElement.style.setProperty('--s', scale);
    Game.resize(scale);
  }

  function hideOverlays() {
    OVERLAYS.forEach((id) => {
      $(id).hidden = true;
    });
  }

  function overlayOpen() {
    return OVERLAYS.some((id) => !$(id).hidden) || !menu.hidden;
  }

  function updateHud() {
    $('#player-name').textContent = Data.save ? Data.nameText() : I18n.t('hud.player');
  }

  function setHearts(n) {
    $('#hearts').textContent = '♥'.repeat(n);
  }

  // ---------- 1. 언어 선택 ----------
  function showLang() {
    hideOverlays();
    titleEl.hidden = true;
    $('#lang-screen').hidden = false;
    $('#lang-screen button').focus();
  }

  async function pickLang(code) {
    Sound.unlock();
    Sound.play('select');
    await I18n.set(code);
    $('#lang-screen').hidden = true;
    showTitle();
  }

  // ---------- 2. 타이틀 ----------
  function showTitle() {
    Story.stop();
    hideOverlays();
    Game.setMode('title');
    stage.classList.remove('playing');
    titleEl.hidden = false;
    const has = !!Data.load();
    $('#start-btn').hidden = has;
    $('#continue-btn').hidden = !has;
    $('#new-btn').hidden = !has;
    updateHud();
    setHearts(3);
  }

  function start(fresh) {
    Sound.unlock();
    Sound.play('start');
    titleEl.hidden = true;
    if (fresh || !Data.save) {
      Data.clear();
      showSetup();
    } else {
      showMap();
    }
  }

  // ---------- 3. 여행자 등록 (모험 이름, 나이) ----------
  let draft = null;

  function showSetup() {
    hideOverlays();
    draft = Data.create();
    renderSetup();
    $('#setup-screen').hidden = false;
  }

  function renderSetup() {
    if (!draft) return;
    $('#setup-name').textContent = Data.nameText(draft);
    $('#setup-code').textContent = Data.codeText(draft);
    // 나이: 눌러서 스크롤로 고르는 목록 (7살 ~ 성인, 비밀)
    const select = $('#setup-age');
    select.innerHTML = '';
    const opts = [['', I18n.t('setup.agePick')]];
    for (let age = MIN_AGE; age <= MAX_AGE; age++) opts.push([String(age), `${age}${I18n.t('setup.ageUnit')}`]);
    opts.push([`${MAX_AGE + 1}+`, I18n.t('setup.ageOver').replace('{n}', MAX_AGE + 1)]);
    opts.push(['secret', I18n.t('setup.ageSecret')]);
    opts.forEach(([value, label]) => {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = label;
      if (value === '') o.disabled = true;
      select.appendChild(o);
    });
    select.value = draft.age === null ? '' : String(draft.age);
  }

  function shiftName(part, step) {
    const list = I18n.t(part === 0 ? 'nameParts.adj' : 'nameParts.noun');
    draft.name[part] = (draft.name[part] + step + list.length) % list.length;
    Sound.play('blip');
    renderSetup();
  }

  function rollName() {
    const adj = I18n.t('nameParts.adj');
    const noun = I18n.t('nameParts.noun');
    draft.name = [Math.floor(Math.random() * adj.length), Math.floor(Math.random() * noun.length)];
    Sound.play('select');
    renderSetup();
  }

  function confirmSetup() {
    if (draft.age === null) {
      $('#setup-error').hidden = false;
      return;
    }
    Data.persist();
    Data.send('register', { name: draft.name });
    Sound.play('powerup');
    updateHud();
    showMap();
  }

  // ---------- 4. 모험 지도 ----------
  function showMap() {
    Story.stop();
    hideOverlays();
    titleEl.hidden = true;
    stage.classList.add('playing');
    Game.reset('wild');
    renderMap();
    $('#map-screen').hidden = false;
  }

  function renderMap() {
    const s = Data.save;
    if (!s) return;
    $('#map-name').textContent = Data.nameText();
    $('#map-code').textContent = Data.codeText();
    const avatar = $('#map-avatar');
    avatar.hidden = !s.disc;
    if (s.disc) avatar.src = `assets/sprites/${s.disc.primary.toLowerCase()}.png`;
    const list = $('#map-list');
    list.innerHTML = '';
    for (let ep = 1; ep <= 6; ep++) {
      const done = !!s.done[ep];
      const open = ep === 1 || !!s.done[ep - 1];
      const ready = READY_EPISODES.includes(ep);
      const li = document.createElement('li');
      li.className = `ep${done ? ' is-done' : ''}${open && ready ? ' is-open' : ''}`;
      const status = done ? I18n.t('map.done') : !ready ? I18n.t('map.soon') : open ? '' : I18n.t('map.locked');
      li.innerHTML = `
        <div class="ep-num">${I18n.t('map.ep')} ${ep}</div>
        <div class="ep-body">
          <div class="ep-title"></div>
          <div class="ep-desc"></div>
        </div>
        <div class="ep-side"><span class="ep-status"></span></div>`;
      li.querySelector('.ep-title').textContent = I18n.t(`episodes.${ep}.title`);
      li.querySelector('.ep-desc').textContent = I18n.t(`episodes.${ep}.desc`);
      li.querySelector('.ep-status').textContent = status;
      const side = li.querySelector('.ep-side');
      if (open && ready) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pill pill-primary';
        b.textContent = done ? I18n.t('map.replay') : I18n.t('map.play');
        b.addEventListener('click', () => playEpisode(ep));
        side.appendChild(b);
      }
      if (ep === 1) {
        const v = document.createElement('button');
        v.type = 'button';
        v.className = 'pill';
        v.textContent = I18n.t('map.video');
        v.addEventListener('click', openVideo);
        side.appendChild(v);
      }
      list.appendChild(li);
    }
  }

  // ---------- 5. 에피소드 ----------
  const EP1 = [
    {
      do: () => {
        Game.reset('village');
        Game.hideParty();
        Game.showGem();
      },
      wait: 1400,
    },
    { who: 'narrator', key: 'ep1.s1' },
    { who: 'narrator', key: 'ep1.s2' },
    {
      do: () => {
        Game.night(true);
        Game.enter('mamba');
      },
      wait: 1600,
    },
    { who: 'narrator', key: 'ep1.s3' },
    { who: 'mamba', key: 'ep1.mamba1' },
    { do: () => Game.stealGem(), wait: 1300 },
    { do: () => Game.leave('mamba'), wait: 1800 },
    { who: 'narrator', key: 'ep1.s4' },
    { do: () => Game.showcase('I'), wait: 700 },
    { who: 'narrator', key: 'ep1.sI' },
    { who: 'I', key: 'ep1.selfI' },
    { do: () => Game.showcase('D'), wait: 600 },
    { who: 'narrator', key: 'ep1.sD' },
    { who: 'D', key: 'ep1.selfD' },
    { do: () => Game.showcase('S'), wait: 600 },
    { who: 'narrator', key: 'ep1.sS' },
    { who: 'S', key: 'ep1.selfS' },
    { do: () => Game.showcase('C'), wait: 600 },
    { who: 'narrator', key: 'ep1.sC' },
    { who: 'C', key: 'ep1.selfC' },
    {
      do: async () => {
        await Game.fadeTo('wild');
        Game.hideParty();
        Game.night(true);
        Game.portal(true);
      },
      wait: 1200,
    },
    { who: 'narrator', key: 'ep1.s5' },
    { do: () => Game.enter('angel'), wait: 1200 },
    { who: 'angel', key: 'ep1.angel1' },
    { who: 'angel', key: 'ep1.angel2' },
    { do: () => Game.partyEnter(), wait: 2800 },
    {
      do: () => {
        Game.portal(false);
        Game.night(false);
        Game.walk(true);
      },
      wait: 900,
    },
    { who: 'narrator', key: 'ep1.s6' },
    { who: 'D', key: 'ep1.partyD' },
    { who: 'I', key: 'ep1.partyI' },
    { who: 'S', key: 'ep1.partyS' },
    { who: 'C', key: 'ep1.partyC' },
    { who: 'angel', key: 'ep1.angel3' },
    { do: () => Game.walk(false) },
    { who: 'narrator', key: 'ep1.n2', do: () => Game.enter('devil'), wait: 700 },
    {
      who: 'devil',
      key: 'ep1.devil1',
      choices: [
        {
          key: 'ep1.choiceRest',
          then: [
            { who: 'devil', key: 'ep1.devilRest' },
            { who: 'angel', key: 'ep1.angelRest' },
          ],
        },
        {
          key: 'ep1.choiceGo',
          then: [
            { who: 'devil', key: 'ep1.devilGo' },
            { who: 'angel', key: 'ep1.angelGo', do: () => gainConfidence() },
          ],
        },
      ],
    },
    { do: () => Game.leave('devil'), wait: 700 },
    { who: 'angel', key: 'ep1.angel4' },
  ];

  const EP2_INTRO = [
    { do: () => Game.reset('wild'), wait: 500 },
    { do: () => Game.enter('angel'), wait: 1100 },
    { who: 'angel', key: 'ep2.intro1' },
    { who: 'angel', key: 'ep2.intro2' },
  ];

  async function playEpisode(ep) {
    hideOverlays();
    titleEl.hidden = true;
    stage.classList.add('playing');
    Sound.play('start');
    setHearts(3);
    if (ep === 1) {
      await Story.play(EP1);
    } else if (ep === 2) {
      await Story.play(EP2_INTRO);
      const result = await Quiz.start();
      Data.save.disc = result;
      Data.persist();
      Data.send('disc_result', {
        answers: result.answers.join(''),
        scores: result.scores,
        primary: result.primary,
        secondary: result.secondary,
      });
      await showResult(result);
      await Story.play([{ who: 'angel', key: 'ep2.angelResult' }]);
    }
    showClear(ep);
  }

  function gainConfidence() {
    Game.cheer();
    setHearts(4);
    const pop = $('#bonus');
    pop.hidden = false;
    pop.classList.remove('pop');
    void pop.offsetWidth;
    pop.classList.add('pop');
    setTimeout(() => (pop.hidden = true), 1600);
  }

  // ---------- 캐릭터 결과 ----------
  let resultDone = null;

  function renderResult() {
    const d = Data.save && Data.save.disc;
    if (!d) return;
    $('#result-title').textContent = I18n.t('ep2.resultTitle').replace('{name}', Data.nameText());
    const card = $('#result-card');
    const flipped = card.classList.contains('flipped');
    Card.render(card, d.primary);
    card.classList.toggle('flipped', flipped);
    $('#result-flip').textContent = flipped ? I18n.t('ep2.flipFront') : I18n.t('ep2.flipBack');
    const sub = Card.local(d.secondary);
    $('#result-sub-img').src = `assets/sprites/${d.secondary.toLowerCase()}.png`;
    $('#result-sub-line').textContent = I18n.t('ep2.subLine').replace('{job}', sub.job);
    $('#result-sub-desc').textContent = sub.summary;
    $('#result-main-desc').textContent = Card.local(d.primary).summary;
  }

  function showResult() {
    hideOverlays();
    $('#result-card').classList.remove('flipped');
    renderResult();
    $('#result-screen').hidden = false;
    Sound.play('clear');
    return new Promise((resolve) => {
      resultDone = resolve;
    });
  }

  // ---------- 클리어 ----------
  function showClear(ep) {
    Data.complete(ep);
    hideOverlays();
    $('#clear-ep').textContent = `${I18n.t('map.ep')} ${ep}`;
    $('#clear-video').hidden = ep !== 1;
    $('#clear-screen').hidden = false;
    Sound.play('clear');
    $('#clear-map').focus();
  }

  // ---------- 소개 영상 ----------
  function openVideo() {
    Sound.unlock();
    $('#video-frame').src = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?rel=0`;
    $('#video-link').href = `https://youtu.be/${VIDEO_ID}`;
    $('#video-modal').hidden = false;
  }

  function closeVideo() {
    $('#video-frame').src = 'about:blank';
    $('#video-modal').hidden = true;
  }

  // ---------- 설정 메뉴 ----------
  function openMenu() {
    Sound.unlock();
    menu.hidden = false;
    syncMenu();
    menu.querySelector('button').focus();
  }

  function closeMenu() {
    menu.hidden = true;
    // 메뉴 버튼에 초점을 남기면 스페이스바가 대사 넘기기 대신 메뉴를 다시 연다
    document.activeElement.blur();
  }

  function syncMenu() {
    menu.querySelectorAll('[data-lang]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.lang === I18n.lang));
    });
    menu.querySelectorAll('[data-sound]').forEach((b) => {
      b.setAttribute('aria-pressed', String((b.dataset.sound === 'on') !== Sound.muted));
    });
    $('#menu-map').hidden = !Data.save || Data.save.age === null;
    const mute = $('#mute-btn');
    mute.textContent = Sound.muted ? '🔇' : '🔊';
    mute.setAttribute('aria-label', I18n.t(Sound.muted ? 'hud.soundOff' : 'hud.soundOn'));
  }

  // 언어가 바뀌면 열려 있는 화면을 모두 새 언어로 다시 그린다
  function relabel() {
    syncMenu();
    updateHud();
    if (!$('#setup-screen').hidden) renderSetup();
    if (!$('#map-screen').hidden) renderMap();
    if (!$('#result-screen').hidden) renderResult();
    Quiz.rerender();
  }

  function bind() {
    document.querySelectorAll('[data-pick-lang]').forEach((b) => b.addEventListener('click', () => pickLang(b.dataset.pickLang)));
    $('#start-btn').addEventListener('click', () => start(true));
    $('#continue-btn').addEventListener('click', () => start(false));
    $('#new-btn').addEventListener('click', () => start(true));

    $('#name-adj-prev').addEventListener('click', () => shiftName(0, -1));
    $('#name-adj-next').addEventListener('click', () => shiftName(0, 1));
    $('#name-noun-prev').addEventListener('click', () => shiftName(1, -1));
    $('#name-noun-next').addEventListener('click', () => shiftName(1, 1));
    $('#name-dice').addEventListener('click', rollName);
    $('#setup-go').addEventListener('click', confirmSetup);
    $('#setup-age').addEventListener('change', (e) => {
      const v = e.target.value;
      draft.age = /^\d+$/.test(v) ? Number(v) : v;
      Sound.play('select');
      $('#setup-error').hidden = true;
    });

    $('#quiz-back').addEventListener('click', () => Quiz.back());
    $('#result-flip').addEventListener('click', () => {
      $('#result-card').classList.toggle('flipped');
      Sound.play('select');
      renderResult();
    });
    $('#result-card').addEventListener('click', () => $('#result-flip').click());
    $('#result-next').addEventListener('click', () => {
      $('#result-screen').hidden = true;
      const r = resultDone;
      resultDone = null;
      if (r) r();
    });

    $('#clear-map').addEventListener('click', showMap);
    $('#clear-video').addEventListener('click', openVideo);
    $('#video-close').addEventListener('click', closeVideo);

    // 화면 어디를 눌러도 대사가 넘어간다 (버튼과 열린 패널은 제외)
    document.addEventListener('click', (e) => {
      if (e.target.closest('button, a, .screen, .menu, .dialog')) return;
      if (overlayOpen() || !titleEl.hidden) return;
      Story.advance();
    });
    // 전체 화면 패널이 열려 있으면 MENU 줄을 화면 맨 위에 고정한다
    const syncOverlayClass = () => document.body.classList.toggle('overlay-open', OVERLAYS.some((id) => !$(id).hidden));
    const watcher = new MutationObserver(syncOverlayClass);
    OVERLAYS.forEach((id) => watcher.observe($(id), { attributes: true, attributeFilter: ['hidden'] }));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!menu.hidden) closeMenu();
        else if (!$('#video-modal').hidden) closeVideo();
        return;
      }
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
      if (overlayOpen()) return;
      e.preventDefault();
      if (!titleEl.hidden) start(!Data.save);
      else Story.advance();
    });

    $('#menu-btn').addEventListener('click', openMenu);
    $('#menu-close').addEventListener('click', closeMenu);
    $('#menu-map').addEventListener('click', () => {
      closeMenu();
      showMap();
    });
    $('#menu-restart').addEventListener('click', () => {
      closeMenu();
      showTitle();
    });
    menu.addEventListener('click', (e) => {
      if (e.target === menu) closeMenu();
    });
    menu.querySelectorAll('[data-lang]').forEach((b) =>
      b.addEventListener('click', async () => {
        Sound.play('select');
        await I18n.set(b.dataset.lang);
      })
    );
    menu.querySelectorAll('[data-sound]').forEach((b) =>
      b.addEventListener('click', () => {
        Sound.setMuted(b.dataset.sound === 'off');
        Sound.play('select');
        syncMenu();
      })
    );
    $('#mute-btn').addEventListener('click', () => {
      Sound.unlock();
      Sound.setMuted(!Sound.muted);
      Sound.play('select');
      syncMenu();
    });
    I18n.onChange(relabel);
    window.addEventListener('resize', fit);
  }

  async function boot() {
    Game.init($('#screen'));
    fit();
    Story.init();
    bind();
    await Promise.all([I18n.init(), Sprites.loadParty(), Card.loadTypes(), Quiz.loadDisc()]);
    Data.load();
    syncMenu();
    updateHud();
    Game.setMode('title');
    document.body.classList.add('ready');
    showLang();
  }

  boot();
})();
