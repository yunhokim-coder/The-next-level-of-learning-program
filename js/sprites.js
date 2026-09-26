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
    // 마음 게이지 아이콘
    e: '#b5562e', f: '#e08050', u: '#4a7bd0', w: '#cfe0ff', z: '#6b3e1e',
  };

  // 친구 두 명 얼굴 (함께 게이지)
  function friend(hair, shirt) {
    return [
      '.KKKKK.',
      `K${hair.repeat(5)}K`,
      'KSKSKSK',
      'KSSSSSK',
      'KSRRRSK',
      '.KKKKK.',
      `.K${shirt.repeat(3)}K.`,
      `K${shirt.repeat(5)}K`,
      `KS${shirt.repeat(3)}SK`,
      'KKKKKKK',
    ];
  }
  const friendRows = friend('H', 'T').map((row, i) => `${row}.${friend('z', 'u')[i]}`);

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
    heart: [
      [
        '.KKK...KKK.',
        'KRRRK.KRRRK',
        'KRWRRKRRRRK',
        'KRRRRRRRRRK',
        'KRRRRRRRRRK',
        '.KRRRRRRRK.',
        '..KRRRRRK..',
        '...KRRRK...',
        '....KRK....',
        '.....K.....',
      ],
    ],
    coin: [
      [
        '...KKKK...',
        '.KKYYYYKK.',
        '.KYLLYYYK.',
        'KYLYYYYhYK',
        'KYLYhhYhYK',
        'KYYYhhYhYK',
        'KYYYYYYhYK',
        '.KYYhhhYK.',
        '.KKYYYYKK.',
        '...KKKK...',
      ],
    ],
    star: [
      [
        '.....K.....',
        '....KYK....',
        '....KYK....',
        'KKKKYYYKKKK',
        'KYYYYYYYYYK',
        '.KYYYYYYYK.',
        '..KYYYYYK..',
        '..KYYKYYK..',
        '.KYYK.KYYK.',
        '.KYK...KYK.',
        '.KK.....KK.',
      ],
    ],
    meat: [
      [
        '...KKKK.....',
        '..KeeeeK....',
        '.KefeeeeK...',
        '.KeeeeeeK...',
        '.KeeeeeeK...',
        '..KeeeeKK...',
        '...KKKKWK...',
        '.......KWK..',
        '......KWWWK.',
        '.......KWK..',
      ],
    ],
    shield: [
      [
        'KKKKKKKKKK',
        'KuuuuuuuuK',
        'KuwwuuuuuK',
        'KuwuuuuuuK',
        'KuuuuuuuuK',
        'KuuuuuuuuK',
        '.KuuuuuuK.',
        '.KuuuuuuK.',
        '..KuuuuK..',
        '...KuuK...',
        '....KK....',
      ],
    ],
    friends: [friendRows],
    compass: [
      [
        '.....KKKK.....',
        '....KYYYYK....',
        '.....KYYK.....',
        '...KKKKKKKK...',
        '..KYYYYYYYYK..',
        '.KYWWWWRWWWYK.',
        '.KYWWWWRWWWYK.',
        '.KYWWWKKWWWYK.',
        '.KYWWWuWWWWYK.',
        '.KYWWWuWWWWYK.',
        '..KYWWWWWWYK..',
        '...KYYYYYYK...',
        '....KKKKKK....',
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

  // 패널(HTML)에서 쓸 아이콘 그림 주소. 도트가 뭉개지지 않게 정수배로 키운다
  const urls = {};
  function iconURL(name, scale = 4) {
    const key = `${name}@${scale}`;
    if (!urls[key]) {
      const src = baked[name][0];
      const c = document.createElement('canvas');
      c.width = src.width * scale;
      c.height = src.height * scale;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(src, 0, 0, c.width, c.height);
      urls[key] = c.toDataURL();
    }
    return urls[key];
  }

  window.Sprites = {
    PALETTE,
    frames: baked,
    iconURL,
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
