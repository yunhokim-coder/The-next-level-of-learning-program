// 화면 전환, 대사 진행, 설정 메뉴.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const stage = $('#stage');
  const titleEl = $('#title');
  const dialog = $('#dialog');
  const nameEl = $('#dialog-name');
  const textEl = $('#dialog-text');
  const choicesEl = $('#choices');
  const clearEl = $('#clear');
  const menu = $('#menu');

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
  }

  // ---------- 대본 ----------
  // who: 말하는 캐릭터 (names.* 키), key: 문구 키, do: 대사 전에 실행할 연출, wait: 연출 후 기다릴 시간(ms)
  const SCRIPT = [
    { do: () => Game.walk(true) },
    { who: 'narrator', key: 'demo.n1' },
    { do: () => Game.enter('angel'), wait: 1200 },
    { who: 'angel', key: 'demo.angel1' },
    { who: 'angel', key: 'demo.angel2' },
    { who: 'D', key: 'demo.partyD' },
    { who: 'I', key: 'demo.partyI' },
    { who: 'S', key: 'demo.partyS' },
    { who: 'C', key: 'demo.partyC' },
    { do: () => Game.walk(false) },
    { who: 'narrator', key: 'demo.n2', do: () => Game.enter('devil'), wait: 700 },
    {
      who: 'devil',
      key: 'demo.devil1',
      choices: [
        {
          key: 'demo.choiceRest',
          then: [
            { who: 'devil', key: 'demo.devilRest' },
            { who: 'angel', key: 'demo.angelRest' },
          ],
        },
        {
          key: 'demo.choiceGo',
          then: [
            { who: 'devil', key: 'demo.devilGo' },
            { who: 'angel', key: 'demo.angelGo', do: () => gainConfidence() },
          ],
        },
      ],
    },
    { do: () => Game.leave('devil'), wait: 700 },
    { do: () => Game.walk(true), wait: 1400 },
    { do: () => Game.walk(false) },
    { who: 'narrator', key: 'demo.n3', do: () => Game.enter('mamba'), wait: 1600 },
    { who: 'mamba', key: 'demo.mamba1' },
    { who: 'angel', key: 'demo.angel3' },
    { do: () => showClear() },
  ];

  let queue = [];
  let typing = null;
  let current = null;
  let waitingChoice = false;
  let busy = false;

  function startDemo() {
    Sound.unlock();
    Sound.play('start');
    titleEl.hidden = true;
    clearEl.hidden = true;
    stage.classList.add('playing');
    Game.reset();
    Game.setMode('walk');
    setHearts(3);
    queue = SCRIPT.slice();
    next();
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function next() {
    if (busy || waitingChoice) return;
    busy = true;
    while (queue.length) {
      const step = queue.shift();
      if (step.do) step.do();
      if (step.wait) {
        dialog.hidden = true;
        await sleep(step.wait);
      }
      if (step.key) {
        say(step);
        busy = false;
        return;
      }
    }
    busy = false;
  }

  function say(step) {
    current = step;
    dialog.hidden = false;
    dialog.dataset.who = step.who;
    choicesEl.hidden = true;
    choicesEl.innerHTML = '';
    const name = I18n.t(`names.${step.who}`);
    nameEl.textContent = name;
    nameEl.hidden = !name;
    if (step.who !== 'narrator') Game.focus(step.who);
    typeText(I18n.t(step.key));
  }

  function typeText(full) {
    clearInterval(typing);
    let i = 0;
    textEl.textContent = '';
    typing = setInterval(() => {
      i++;
      textEl.textContent = full.slice(0, i);
      if (i % 2 === 0 && full[i - 1] !== ' ') Sound.play('blip');
      if (i >= full.length) finishTyping();
    }, 32);
  }

  function finishTyping() {
    clearInterval(typing);
    typing = null;
    if (current) textEl.textContent = I18n.t(current.key);
    if (current && current.choices) showChoices(current.choices);
  }

  function showChoices(choices) {
    waitingChoice = true;
    choicesEl.innerHTML = '';
    choices.forEach((c) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = I18n.t(c.key);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        Sound.play('select');
        waitingChoice = false;
        choicesEl.hidden = true;
        queue = c.then.concat(queue);
        next();
      });
      choicesEl.appendChild(b);
    });
    choicesEl.hidden = false;
    choicesEl.querySelector('button').focus();
  }

  function advance() {
    if (dialog.hidden || waitingChoice || !current) return;
    if (typing) {
      finishTyping();
      return;
    }
    next();
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

  function setHearts(n) {
    $('#hearts').textContent = '♥'.repeat(n);
  }

  function showClear() {
    dialog.hidden = true;
    current = null;
    Sound.play('clear');
    clearEl.hidden = false;
    $('#replay').focus();
  }

  function toTitle() {
    queue = [];
    current = null;
    waitingChoice = false;
    clearInterval(typing);
    typing = null;
    dialog.hidden = true;
    clearEl.hidden = true;
    stage.classList.remove('playing');
    titleEl.hidden = false;
    Game.setMode('title');
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
    const mute = $('#mute-btn');
    mute.textContent = Sound.muted ? '🔇' : '🔊';
    mute.dataset.i18nAria = Sound.muted ? 'hud.soundOff' : 'hud.soundOn';
    mute.setAttribute('aria-label', I18n.t(mute.dataset.i18nAria));
  }

  function bind() {
    $('#start-btn').addEventListener('click', startDemo);
    $('#replay').addEventListener('click', startDemo);
    stage.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      advance();
    });
    $('#dialog').addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      advance();
    });
    document.addEventListener('keydown', (e) => {
      if (!menu.hidden) {
        if (e.key === 'Escape') closeMenu();
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
        e.preventDefault();
        if (!titleEl.hidden) startDemo();
        else advance();
      }
    });
    $('#menu-btn').addEventListener('click', openMenu);
    $('#menu-close').addEventListener('click', closeMenu);
    $('#menu-restart').addEventListener('click', () => {
      closeMenu();
      toTitle();
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
    // 대사 도중 언어를 바꾸면 지금 대사도 바로 바뀐 언어로 다시 보여준다
    I18n.onChange(() => {
      syncMenu();
      if (current && !dialog.hidden) {
        nameEl.textContent = I18n.t(`names.${current.who}`);
        finishTyping();
        if (waitingChoice) showChoices(current.choices);
      }
    });
    window.addEventListener('resize', fit);
  }

  async function boot() {
    Game.init($('#screen'));
    fit();
    bind();
    await Promise.all([I18n.init(), Sprites.loadParty()]);
    syncMenu();
    Game.setMode('title');
    document.body.classList.add('ready');
  }

  boot();
})();
