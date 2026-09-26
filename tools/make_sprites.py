"""원본 캐릭터 카드 앞면을 보고 게임용 도트 캐릭터를 다시 그린다.

원본은 칸 크기가 고르지 않은 도트풍 그림이라 그대로 줄이면 흐려진다.
그래서 세로 ROWS칸 격자에 맞춰 칸마다 색을 하나로 정하고
(윤곽선이 걸친 칸은 윤곽선으로, 나머지는 칸의 평균색으로)
선명한 진짜 도트 그림으로 옮긴다.

사용법: python3 tools/make_sprites.py   (Pillow 필요)
결과: assets/sprites/{d,i,s,c}.png  (세로 ROWS칸, 1칸 = 1픽셀, 투명 배경)
"""
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/cards/characters"
OUT = ROOT / "assets/sprites"
ROWS = 96
OUTLINE = (27, 27, 36, 255)

# 배경 흰색이 캐릭터 안쪽으로 번지지 않도록 막는 선 (카드 원본 좌표, 스프라이트에만 적용)
SEALS = {
    "i": [(291, 372, 533, 384)],  # 모자 윗면에 윤곽선이 없음
}


def is_white(c):
    return c[0] > 225 and c[1] > 225 and c[2] > 225


def extract(key):
    im = Image.open(SRC / f"{key}-front.webp").convert("RGBA")
    draw = ImageDraw.Draw(im)
    for box in SEALS.get(key, []):
        draw.rectangle(box, fill=(28, 26, 28, 255))
    w, h = im.size
    px = im.load()

    # 카드 안쪽 흰 패널의 왼쪽 끝을 찾는다
    y = h // 2
    x = 0
    while not is_white(px[x, y]):
        x += 1
    x += 6

    # 패널 가장자리에서 흰 배경을 투명하게 지운다
    seen = set()
    queue = deque([(x, 300)])
    while queue:
        a, b = queue.popleft()
        if (a, b) in seen or not (0 <= a < w and 0 <= b < h):
            continue
        seen.add((a, b))
        if not is_white(px[a, b]):
            continue
        px[a, b] = (255, 255, 255, 0)
        queue.extend([(a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)])

    panel = im.crop((x - 4, 260, w - (x - 4), 1200))
    pp = panel.load()
    pw, ph = panel.size
    # 패널 위아래 가장자리의 가로 테두리 선은 캐릭터가 아니므로 지운다
    for b in list(range(0, 60)) + list(range(ph - 60, ph)):
        if sum(1 for a in range(pw) if pp[a, b][3]) > pw * 0.6:
            for a in range(pw):
                pp[a, b] = (255, 255, 255, 0)
    xs, ys = [], []
    for a in range(12, pw - 12):
        for b in range(12, ph - 12):
            if pp[a, b][3]:
                xs.append(a)
                ys.append(b)
    sprite = panel.crop((min(xs), min(ys), max(xs) + 1, max(ys) + 1))

    return pixelate(sprite)


def luma(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def pixelate(sprite):
    sw, sh = sprite.size
    cell = sh / ROWS
    cols = round(sw / cell)
    sp = sprite.load()

    # 칸 평균색을 16단계로 맞춰 펠트 질감의 잡티를 없앤다 (작은 포인트 색은 그대로 살린다)
    def nearest(c):
        return tuple(min(255, int(round(v / 16) * 16)) for v in c)

    out = Image.new("RGBA", (cols, ROWS), (0, 0, 0, 0))
    op = out.load()
    for cx in range(cols):
        for cy in range(ROWS):
            x0, x1 = int(cx * cell), max(int(cx * cell) + 1, int((cx + 1) * cell))
            y0, y1 = int(cy * cell), max(int(cy * cell) + 1, int((cy + 1) * cell))
            total = opaque = dark = 0
            rs = gs = bs = 0
            for x in range(x0, min(x1, sw)):
                for y in range(y0, min(y1, sh)):
                    total += 1
                    c = sp[x, y]
                    if c[3] < 128:
                        continue
                    opaque += 1
                    if luma(c) < 70:
                        dark += 1
                    else:
                        rs += c[0]
                        gs += c[1]
                        bs += c[2]
            if not total or opaque / total < 0.4:
                continue
            light = opaque - dark
            # 윤곽선이 칸의 1/4 넘게 걸치면 윤곽선 칸 (얇은 선이 끊기지 않게)
            if dark / opaque > 0.25 or not light:
                op[cx, cy] = OUTLINE
            else:
                op[cx, cy] = nearest((rs / light, gs / light, bs / light)) + (255,)
    return out


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for key in "disc":
        img = extract(key)
        img.save(OUT / f"{key}.png")
        print(key, img.size)
