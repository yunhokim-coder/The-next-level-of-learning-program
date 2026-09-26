// 대사 진행기: 대본(step 배열)을 한 줄씩 보여주고, 선택지가 있으면 고른 쪽 대본을 이어 붙인다.
// step = { who, key, do, wait, choices: [{ key, then: [steps] }] }
(function () {
  const $ = (sel) => document.querySelector(sel);
  let dialog;
  let nameEl;
  let textEl;
  let choicesEl;

  let queue = [];
  let current = null;
  let typing = null;
  let waitingChoice = false;
  let busy = false;
  let finish = null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // {name} 같은 자리에 여행자 이름을 넣는다
  function fill(text) {
    return String(text).replace('{name}', Data.nameText());
  }

  function textOf(step) {
    return fill(I18n.t(step.key));
  }

  async function next() {
    if (busy || waitingChoice) return;
    busy = true;
    while (queue.length) {
      const step = queue.shift();
      if (step.do) await step.do();
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
    dialog.hidden = true;
    current = null;
    const done = finish;
    finish = null;
    if (done) done();
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
    typeText(textOf(step));
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
    }, 30);
  }

  function finishTyping() {
    clearInterval(typing);
    typing = null;
    if (!current) return;
    textEl.textContent = textOf(current);
    if (current.choices) showChoices(current.choices);
  }

  function showChoices(choices) {
    waitingChoice = true;
    choicesEl.innerHTML = '';
    choices.forEach((c) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.type = 'button';
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

  window.Story = {
    init() {
      dialog = $('#dialog');
      nameEl = $('#dialog-name');
      textEl = $('#dialog-text');
      choicesEl = $('#choices');
      dialog.addEventListener('click', (e) => {
        if (!e.target.closest('button')) this.advance();
      });
      I18n.onChange(() => this.refresh());
    },
    // 대본을 끝까지 재생하면 resolve 된다
    play(script) {
      this.stop();
      queue = script.slice();
      return new Promise((resolve) => {
        finish = resolve;
        next();
      });
    },
    stop() {
      queue = [];
      current = null;
      waitingChoice = false;
      busy = false;
      finish = null;
      clearInterval(typing);
      typing = null;
      if (dialog) dialog.hidden = true;
    },
    get active() {
      return !!current && !dialog.hidden;
    },
    advance() {
      if (dialog.hidden || waitingChoice || !current) return;
      if (typing) {
        finishTyping();
        return;
      }
      next();
    },
    // 대사 도중 언어를 바꾸면 지금 대사를 바뀐 언어로 다시 보여준다
    refresh() {
      if (!current || dialog.hidden) return;
      nameEl.textContent = I18n.t(`names.${current.who}`);
      finishTyping();
    },
  };
})();
