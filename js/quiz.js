// 에피소드 2: DISC 성격 검사 (24문항) → 점수 집계 → 1·2순위 유형.
// 문항과 집계표는 data/disc.json. 각 문항에서 고른 보기(A~D)가 key에 따라 한 유형에 1점이 된다.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const TYPES = ['D', 'I', 'S', 'C'];
  let disc = null;
  let answers = [];
  let index = 0;
  let resolveQuiz = null;

  async function loadDisc() {
    if (!disc) disc = await (await fetch('data/disc.json', { cache: 'no-cache' })).json();
    return disc;
  }

  function score(ans) {
    const s = { D: 0, I: 0, S: 0, C: 0 };
    ans.forEach((letter, i) => {
      if (!letter) return;
      const key = disc.items[i].key;
      const type = TYPES.find((tp) => key[tp] === letter);
      s[type] += 1;
    });
    return s;
  }

  // 가장 높은 점수의 유형들 (동점이면 여러 개)
  function topOf(scores, exclude = []) {
    const pool = TYPES.filter((tp) => !exclude.includes(tp));
    const max = Math.max(...pool.map((tp) => scores[tp]));
    return pool.filter((tp) => scores[tp] === max);
  }

  function render() {
    const item = disc.items[index];
    const lang = I18n.lang;
    $('#quiz-count').textContent = `${index + 1} / ${disc.items.length}`;
    $('#quiz-bar').style.width = `${(index / disc.items.length) * 100}%`;
    $('#quiz-back').hidden = index === 0;
    const box = $('#quiz-options');
    box.innerHTML = '';
    ['A', 'B', 'C', 'D'].forEach((letter) => {
      const opt = item.options[letter][lang] || item.options[letter].ko;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option';
      if (answers[index] === letter) b.classList.add('picked');
      b.innerHTML = `<span class="option-letter">${letter}</span><span class="option-word"></span><span class="option-desc"></span>`;
      b.querySelector('.option-word').textContent = opt.word;
      b.querySelector('.option-desc').textContent = opt.desc;
      b.addEventListener('click', () => pick(letter, b));
      box.appendChild(b);
    });
    const cheers = I18n.t('ep2.cheer');
    const cheer = index === 6 ? cheers[0] : index === 12 ? cheers[1] : index === 18 ? cheers[2] : '';
    const bubble = $('#quiz-cheer');
    bubble.textContent = cheer;
    bubble.hidden = !cheer;
  }

  function pick(letter, btn) {
    answers[index] = letter;
    Sound.play('select');
    btn.classList.add('picked');
    $('#quiz-options').classList.add('locked');
    setTimeout(() => {
      $('#quiz-options').classList.remove('locked');
      if (index < disc.items.length - 1) {
        index++;
        render();
      } else {
        finish();
      }
    }, 260);
  }

  // 동점일 때는 아이가 직접 고른다
  function choose(title, prompt, options) {
    return new Promise((resolve) => {
      const screen = $('#tie-screen');
      $('#tie-title').textContent = title;
      $('#tie-prompt').textContent = prompt;
      const box = $('#tie-options');
      box.innerHTML = '';
      options.forEach((tp) => {
        const l = Card.local(tp);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tie-option';
        b.innerHTML = `<img src="assets/sprites/${tp.toLowerCase()}.png" alt=""><span></span>`;
        b.querySelector('span').textContent = `${tp} · ${l.job}`;
        b.addEventListener('click', () => {
          Sound.play('select');
          screen.hidden = true;
          resolve(tp);
        });
        box.appendChild(b);
      });
      screen.hidden = false;
    });
  }

  async function finish() {
    $('#quiz-screen').hidden = true;
    const scores = score(answers);
    const firsts = topOf(scores);
    const primary =
      firsts.length > 1 ? await choose(I18n.t('ep2.tieTitle'), I18n.t('ep2.tieFirst'), firsts) : firsts[0];
    const seconds = topOf(scores, [primary]);
    const secondary =
      seconds.length > 1 ? await choose(I18n.t('ep2.tieTitle'), I18n.t('ep2.tieSecond'), seconds) : seconds[0];
    const r = resolveQuiz;
    resolveQuiz = null;
    r({ answers: answers.slice(), scores, primary, secondary });
  }

  window.Quiz = {
    loadDisc,
    start() {
      answers = [];
      index = 0;
      $('#quiz-screen').hidden = false;
      render();
      return new Promise((resolve) => {
        resolveQuiz = resolve;
      });
    },
    back() {
      if (index > 0) {
        index--;
        Sound.play('select');
        render();
      }
    },
    rerender() {
      if (!$('#quiz-screen').hidden) render();
    },
  };
})();
