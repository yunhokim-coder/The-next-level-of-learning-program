// 캐릭터 프로필 카드 (앞면: 캐릭터, 뒷면: 능력치). 원작 카드 디자인을 HTML로 옮겨 두 언어로 보여준다.
(function () {
  let types = null;

  async function loadTypes() {
    if (!types) types = await (await fetch('data/types.json')).json();
    return types;
  }

  function local(type) {
    const tp = types[type];
    if (I18n.lang === 'en') {
      return { ...tp.en, element: { icon: tp.element.icon, name: tp.en.element } };
    }
    return tp;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  function html(type) {
    const tp = types[type];
    const l = local(type);
    const typeLabel = I18n.t('card.type').replace('{code}', type);
    const row = (label, value) =>
      `<div class="stat"><div class="stat-label">${esc(label)}</div><div class="stat-value">${value}</div></div>`;
    return `
      <div class="card-inner" style="--card:${tp.color}">
        <div class="card-face card-front">
          <div class="card-badge">${esc(typeLabel)}</div>
          <div class="card-art"><img src="assets/sprites/${type.toLowerCase()}.png" alt="${esc(l.job)}"></div>
          <div class="card-name">${esc(l.job)}</div>
          <div class="card-owner">${esc(Data.nameText())} · ${esc(Data.codeText())}</div>
        </div>
        <div class="card-face card-back">
          <div class="card-back-badge">${esc(typeLabel)}</div>
          <div class="card-stats">
            ${row(I18n.t('card.job'), esc(l.job))}
            ${row(I18n.t('card.strengths'), esc(l.strengths.join(', ')))}
            ${row(I18n.t('card.element'), `${tp.element.icon} ${esc(l.element.name)}`)}
            ${row(I18n.t('card.weaknesses'), esc(l.weaknesses.join(', ')))}
            ${row(I18n.t('card.weapon'), esc(l.weapon))}
            ${row(I18n.t('card.growth'), esc(l.growthKeywords.join(', ')))}
          </div>
        </div>
      </div>`;
  }

  window.Card = {
    loadTypes,
    local: (type) => local(type),
    render(el, type) {
      el.classList.add('card');
      el.dataset.type = type;
      el.innerHTML = html(type);
    },
  };
})();
