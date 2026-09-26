"""원본 캐릭터 카드 앞면에서 게임용 도트 스프라이트를 뽑는다.

사용법: python3 tools/make_sprites.py   (Pillow 필요)
결과: assets/sprites/{d,i,s,c}.png  (높이 48px, 투명 배경)
"""
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/cards/characters"
OUT = ROOT / "assets/sprites"
HEIGHT = 48

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
    xs, ys = [], []
    for a in range(12, pw - 12):
        for b in range(12, ph - 12):
            if pp[a, b][3]:
                xs.append(a)
                ys.append(b)
    sprite = panel.crop((min(xs), min(ys), max(xs) + 1, max(ys) + 1))

    small = sprite.resize((round(sprite.width * HEIGHT / sprite.height), HEIGHT), Image.LANCZOS)
    sp = small.load()
    for a in range(small.width):
        for b in range(small.height):
            r, g, bl, al = sp[a, b]
            sp[a, b] = (r, g, bl, 255 if al > 110 else 0)
    return small


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for key in "disc":
        img = extract(key)
        img.save(OUT / f"{key}.png")
        print(key, img.size)
