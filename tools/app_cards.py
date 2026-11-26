# 11-26 단독 앱 카톡 말풍선 그림 4장 (1000x600) — 관리자가 '카톡으로 보내기' 할 때와 링크 미리보기(og:image)에 씀
# 다시 그릴 때: python3 tools/app_cards.py img   (app_icons.py로 아이콘 먼저)
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

out = sys.argv[1] if len(sys.argv) > 1 else 'img'
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'
FONT_B = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
W, H = 1000, 600
APPS = [
    ('eodiya', '어디야', ['안부 묻고,', '위치로 답장받아요'], ((255, 246, 238), (251, 224, 228)), (179, 19, 43)),
    ('card', '싸바카드', ['한마디를', '엽서로 보내요'], ((255, 250, 240), (243, 226, 202)), (179, 19, 43)),
    ('brief', '싸바 브리핑', ['뉴스·날씨·혜택을', '한 화면에'], ((255, 243, 196), (247, 207, 78)), (120, 70, 0)),
    ('bien', '싸바비앙', ['식품명인의 손맛을', '한자리에'], ((251, 244, 226), (231, 207, 143)), (122, 84, 16)),
]


def font(p, n, idx=0):
    try:
        return ImageFont.truetype(p, n, index=idx)
    except Exception:
        return ImageFont.truetype(p, n)


for key, name, lines, (top, bot), ink in APPS:
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(top[i] * (1 - t) + bot[i] * t) for i in range(3)))
    ic = Image.open(f'{out}/{key}-icon-512.png').convert('RGBA').resize((330, 330), Image.LANCZOS)
    m = Image.new('L', ic.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 329, 329], 74, fill=255)
    sh = Image.new('L', (W, H), 0); ImageDraw.Draw(sh).rounded_rectangle([80, 152, 410, 482], 74, fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(18)); im.paste((90, 30, 20), (0, 0), sh)
    im.paste(ic, (80, 135), m)
    d = ImageDraw.Draw(im)
    fn = font(FONT, 96 if len(name) <= 4 else 78, 1)
    d.text((460, 150), name, font=fn, fill=(26, 26, 26))
    fs = font(FONT_B, 46, 1)
    for i, ln in enumerate(lines):
        d.text((464, 290 + i * 64), ln, font=fs, fill=ink)
    # 아래 '눌러서 열기' 알약
    f2 = font(FONT, 34, 1); tx = '눌러서 열기 ›'
    tw = d.textlength(tx, font=f2)
    d.rounded_rectangle([464, 448, 464 + tw + 56, 512], 32, fill=(179, 19, 43))
    d.text((492, 455), tx, font=f2, fill=(255, 255, 255))
    im.save(f'{out}/{key}-app.png', optimize=True)
print('ok')
