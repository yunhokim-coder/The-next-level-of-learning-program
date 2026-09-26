// 여행자 정보(익명 코드, 모험 이름, 나이)와 진행 상황을 이 기기에 저장하고,
// 데이터 수집이 켜져 있을 때만 익명 결과를 보낸다.
// 이름·연락처 등 개인을 알아볼 수 있는 정보는 받지 않는다. 모험 이름은 정해진 낱말 조합에서만 고른다.
(function () {
  const KEY = 'nextlevel.save.v1';
  const cfg = window.APP_CONFIG;
  let save = null;

  const rand = (n) => Math.floor(Math.random() * n);

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch (e) {
      /* 저장이 막힌 기기에서는 이번 방문 동안만 유지 */
    }
  }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.code) save = s;
    } catch (e) {
      save = null;
    }
    return save;
  }

  function create() {
    const adj = I18n.t('nameParts.adj');
    const noun = I18n.t('nameParts.noun');
    save = {
      code: { w: rand(I18n.t('codeWords').length), n: 1000 + rand(9000) },
      name: [rand(adj.length), rand(noun.length)],
      age: null,
      disc: null,
      done: {},
      school: new URLSearchParams(location.search).get('s') || null,
      createdAt: new Date().toISOString(),
    };
    return save;
  }

  function send(event, payload = {}) {
    if (!cfg.DATA_COLLECTION || !cfg.APPS_SCRIPT_URL || !save) return;
    const body = {
      event,
      code: `${save.code.w}-${save.code.n}`,
      school: save.school,
      age: save.age,
      lang: I18n.lang,
      at: new Date().toISOString(),
      ...payload,
    };
    // 전송이 실패해도 앱 진행은 막지 않는다
    fetch(cfg.APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  window.Data = {
    load,
    create,
    persist,
    send,
    get save() {
      return save;
    },
    clear() {
      save = null;
      try {
        localStorage.removeItem(KEY);
      } catch (e) {
        /* 무시 */
      }
    },
    // 모험 이름과 코드는 번호로 저장해 두고, 화면에는 지금 언어로 보여준다
    nameText(s = save) {
      if (!s) return '';
      const adj = I18n.t('nameParts.adj');
      const noun = I18n.t('nameParts.noun');
      return `${adj[s.name[0] % adj.length]} ${noun[s.name[1] % noun.length]}`;
    },
    codeText(s = save) {
      if (!s) return '';
      const words = I18n.t('codeWords');
      return `${words[s.code.w % words.length]}-${s.code.n}`;
    },
    complete(ep) {
      save.done[ep] = true;
      persist();
      send('episode_complete', { episode: ep });
    },
  };
})();
