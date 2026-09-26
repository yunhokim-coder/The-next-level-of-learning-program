// 앱 오리지널 도트 캐릭터 (주인공, 반짝이, 스르륵, 블랙맘바 머리).
// 한 글자 = 한 픽셀. '.'은 투명. 팔레트 글자는 아래 PALETTE에서 색으로 바뀐다.
// 원작 DISC 캐릭터 4종은 카드 원본에서 뽑은 assets/sprites/*.png를 쓴다 (tools/make_sprites.py).
(function () {
  const PALETTE = {
    K: '#1b1b24', // 윤곽선
    W: '#ffffff',
    // 주인공
    H: '#ffd64a', h: '#e0a82e', S: '#ffcf9e', s: '#e9a877',
    T: '#3fd6c6', R: '#e8414f', Y: '#ffd23f', B: '#7a4a2a', P: '#3a3a52', O: '#5a3522',
    // 반짝이
    L: '#fff6b0', p: '#ff9ab8',
    // 스르륵
    V: '#6b3fa0', v: '#9a6ad0', G: '#ffe14a',
    // 블랙맘바
    D: '#2b2b33', d: '#4a4a57', b: '#caa46a',
    // 꿈의 보석
    q: '#ffe0f4', m: '#ff7ac8', n: '#b8409a',
  };

  const legsStand = [
    '...KPPPKKPPPK...',
    '...KPPK..KPPK...',
    '...KOOK..KOOK...',
    '..KOOOK..KOOOK..',
    '..KKKKK..KKKKK..',
  ];
  const legsStep = [
    '...KPPPPPPPPK...',
    '..KPPK..KPPK....',
    '..KOOK..KOOK....',
    '.KOOOK...KOOOK..',
    '.KKKKK...KKKKK..',
  ];
  const heroTop = [
    '......KKKKK.....',
    '....KKHHHHHK....',
    '...KHHHHHHHHK...',
    '..KHHHhHHHhHHK..',
    '..KHHSSSSSShHK..',
    '..KHSSSSSSSSSK..',
    '..KSSKWSSKWSSK..',
    '..KSSKKSSKKSSK..',
    '..KsSSSSSSSSsK..',
    '...KSSSssSSSK...',
    '....KKSSSSKK....',
    '...KRRRKKRRRK...',
    '..KTRRRRRRRRTK..',
    '.KTTTTRRTTTTTTK.',
    '.KSKTTTTTTTTKSK.',
    '.KSKTTTYTTTTKSK.',
    '.KKKBBBBBBBBKKK.',
    '...KTTTTTTTTK...',
    '...KPPPPPPPPK...',
  ];

  const ART = {
    hero: [heroTop.concat(legsStand), heroTop.concat(legsStep)],
    angel: [
      [
        '.......KK.......',
        '......KRRK......',
        '.......KK.......',
        '.....KKKKKK.....',
        'WW..KYYYYYYK..WW',
        'WWWKYLLYYYYYKWWW',
        '.WWKYLYYYYYYKWW.',
        '..KYYKYYYYKYYK..',
        '..KYYKYYYYKYYK..',
        '..KYpYYYYYYpYK..',
        '...KYYYKKYYYK...',
        '....KYYYYYYK....',
        '.....KKKKKK.....',
      ],
      [
        '.......KK.......',
        '......KRRK......',
        '.......KK.......',
        '.....KKKKKK.....',
        '....KYYYYYYK....',
        '...KYLLYYYYYK...',
        '...KYLYYYYYYK...',
        'WWKYYKYYYYKYYKWW',
        'WWKYYKYYYYKYYKWW',
        '.WKYpYYYYYYpYKW.',
        '...KYYYKKYYYK...',
        '....KYYYYYYK....',
        '.....KKKKKK.....',
      ],
    ],
    devil: [
      [
        '.....KKKKK......',
        '....KVVVVVK.....',
        '...KVvVVVVVK....',
        '..KVVGGVVGGVK...',
        '..KVVGKVVGKVK...',
        '..KVVVVVVVVVK...',
        '..KVKWKWKWKVK...',
        '..KVVKKKKKVVK...',
        '...KVVVVVVVK....',
        '....KVVVVVVVKK..',
        '.....KKVVVVVVVK.',
        '.......KKKKKKVK.',
        '............KRRK',
        '...........R...R',
      ],
      [
        '.....KKKKK......',
        '....KVVVVVK.....',
        '...KVvVVVVVK....',
        '..KVVGGVVGGVK...',
        '..KVVKGVVKGVK...',
        '..KVVVVVVVVVK...',
        '..KVKWKWKWKVK...',
        '..KVVKKKKKVVK...',
        '...KVVVVVVVK....',
        '....KVVVVVVVK...',
        '.....KKVVVVVVK..',
        '.......KKKKKVK..',
        '...........KRRK.',
        '..........R...R.',
      ],
    ],
    gem: [
      [
        '.....KK.....',
        '....KqqK....',
        '...KqmmnK...',
        '..KqmmmnnK..',
        '.KqmmmmnnnK.',
        'KqmmmmmnnnnK',
        'KmmmmmmnnnnK',
        'KmmmqmmnnnnK',
        '.KmmmmnnnnK.',
        '..KmmmnnnK..',
        '...KmmnnK...',
        '....KmnK....',
        '.....KK.....',
      ],
    ],
    mambaHead: [
      [
        '...KKKKKK...',
        '.KKDDDDDDKK.',
        'KDGKDDDdDDDK',
        'KDKKDDDDdDDK',
        'KDDDDDDDDDDK',
        '.KbbbbbDDDK.',
        '..KKKKKKKK..',
      ],
    ],
  };

  // 글자 배열을 한 번만 캔버스로 구워서 재사용한다
  function bake(rows) {
    const w = rows[0].length;
    rows.forEach((r, i) => {
      if (r.length !== w) console.warn('sprite row width mismatch', i, r);
    });
    const c = document.createElement('canvas');
    c.width = w;
    c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = PALETTE[row[x]];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    });
    return c;
  }

  const baked = {};
  Object.keys(ART).forEach((k) => {
    baked[k] = ART[k].map(bake);
  });

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  window.Sprites = {
    PALETTE,
    frames: baked,
    party: {},
    async loadParty() {
      const keys = ['d', 'i', 's', 'c'];
      const imgs = await Promise.all(keys.map((k) => loadImage(`assets/sprites/${k}.png`)));
      keys.forEach((k, i) => {
        this.party[k.toUpperCase()] = imgs[i];
      });
    },
  };
})();
