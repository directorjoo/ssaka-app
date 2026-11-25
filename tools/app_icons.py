# 11-25 싸바 단독 앱 아이콘 3개 (어디야 · 싸바카드 · 브리핑) — 싸바스타(star_icon.py)와 같은 방식
# 다시 그릴 때: python3 tools/app_icons.py img
#   어디야  : 체리 빨강 바탕 + 흰 위치핀(안에 체리) + 작은 말풍선 '?'
#   싸바카드: 미색 바탕 + 살짝 기운 옛날 엽서(체리 우표·소인·글줄)
#   브리핑  : 황금 바탕(황금체리나무 색) + 흰 신문 + 떠오르는 해
import math, sys
from PIL import Image, ImageDraw, ImageFilter

out = sys.argv[1] if len(sys.argv) > 1 else 'img'
RED = (179, 19, 43)


def grad(W, top, bot):
    im = Image.new('RGB', (W, W)); d = ImageDraw.Draw(im)
    for y in range(W):
        t = y / W
        d.line([(0, y), (W, y)], fill=tuple(int(top[i] * (1 - t) + bot[i] * t) for i in range(3)))
    return im


def glow(im, box, color, alpha, blur):
    W = im.size[0]
    g = Image.new('L', (W, W), 0); ImageDraw.Draw(g).ellipse(box, fill=alpha)
    g = g.filter(ImageFilter.GaussianBlur(blur))
    im.paste(Image.new('RGB', (W, W), color), (0, 0), g)


def shadow(im, draw_fn, off, blur, alpha=110, color=(60, 0, 10)):
    W = im.size[0]
    m = Image.new('L', (W, W), 0); draw_fn(ImageDraw.Draw(m), off)
    m = m.point(lambda v: alpha if v else 0).filter(ImageFilter.GaussianBlur(blur))
    im.paste(color, (0, 0), m)


def cherry(d, x, y, r, stem=True):
    """체리 한 쌍 (x,y 는 왼쪽 알 가운데)"""
    if stem:
        w = max(2, int(r * 0.22))
        d.line([(x, y - r * 0.6), (x + r * 1.2, y - r * 2.6)], fill=(86, 52, 20), width=w)
        d.line([(x + r * 2.1, y - r * 0.3), (x + r * 1.2, y - r * 2.6)], fill=(86, 52, 20), width=w)
        d.ellipse([x + r * 1.2, y - r * 3.3, x + r * 2.6, y - r * 2.4], fill=(70, 150, 70))
    for cx, cy in [(x, y), (x + r * 2.1, y + r * 0.3)]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(200, 20, 45))
        d.ellipse([cx - r * 0.55, cy - r * 0.6, cx - r * 0.1, cy - r * 0.15], fill=(255, 170, 180))


# ── 어디야 ──────────────────────────────────────────────
def eodiya(S, scale=1.0):
    W = S * 4; im = grad(W, (216, 71, 94), (110, 8, 26)); c = W / 2
    glow(im, [c - W * .4, c - W * .35, c + W * .4, c + W * .45], (255, 214, 120), 55, W * .08)
    R = W * 0.24 * scale; cx = c - W * 0.03 * scale; cy = c - W * 0.06 * scale
    tip = cy + R * 2.05

    def pin(d, o):
        d.ellipse([cx - R, cy - R + o, cx + R, cy + R + o], fill=255)
        d.polygon([(cx - R * 0.78, cy + R * 0.62 + o), (cx + R * 0.78, cy + R * 0.62 + o), (cx, tip + o)], fill=255)
    shadow(im, pin, W * 0.025, W * 0.02)
    d = ImageDraw.Draw(im)
    # 바닥 그림자 타원
    d.ellipse([cx - R * 0.55, tip - R * 0.12, cx + R * 0.55, tip + R * 0.16], fill=(120, 10, 30))
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(255, 250, 238))
    d.polygon([(cx - R * 0.78, cy + R * 0.62), (cx + R * 0.78, cy + R * 0.62), (cx, tip)], fill=(255, 250, 238))
    cherry(d, cx - R * 0.42, cy + R * 0.18, R * 0.3)
    # 말풍선 '?'
    bx, by, br = c + W * 0.25 * scale, c - W * 0.24 * scale, W * 0.1 * scale
    d.ellipse([bx - br, by - br * .85, bx + br, by + br * .85], fill=(255, 214, 92))
    d.polygon([(bx - br * .55, by + br * .5), (bx - br * .1, by + br * .7), (bx - br * .95, by + br * 1.25)], fill=(255, 214, 92))
    q = br * 0.5; lw = int(br * 0.26)
    d.arc([bx - q, by - q * 1.15, bx + q, by + q * 0.55], 190, 80, fill=RED, width=lw)
    d.line([(bx + q * 0.25, by + q * 0.2), (bx, by + q * 0.45), (bx, by + q * 0.7)], fill=RED, width=lw)
    d.ellipse([bx - lw * .6, by + q * 1.05, bx + lw * .6, by + q * 1.05 + lw * 1.2], fill=RED)
    return im.resize((S, S), Image.LANCZOS)


# ── 싸바카드 (엽서) ─────────────────────────────────────
def card(S, scale=1.0):
    W = S * 4; im = grad(W, (255, 248, 236), (243, 222, 196)); c = W / 2
    glow(im, [c - W * .45, c - W * .45, c + W * .45, c + W * .45], (255, 255, 255), 90, W * .1)
    pw, ph = W * 0.74 * scale, W * 0.555 * scale  # 4:3 옛날 엽서
    L = Image.new('RGBA', (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    x0, y0 = c - pw / 2, c - ph / 2; x1, y1 = x0 + pw, y0 + ph
    rr = int(W * 0.03 * scale)
    d.rounded_rectangle([x0, y0, x1, y1], rr, fill=(255, 253, 247, 255), outline=(230, 200, 170, 255), width=max(2, int(W * .006)))
    # 위아래 체리 테두리 띠 (항공 엽서 느낌)
    bh = ph * 0.07; n = 9
    for i in range(n * 2):
        col = (200, 20, 45, 255) if i % 2 == 0 else (60, 110, 170, 255)
        sx = x0 + pw * i / (n * 2)
        d.polygon([(sx, y0 + rr * .4), (sx + pw / (n * 2), y0 + rr * .4), (sx + pw / (n * 2) - bh, y0 + bh + rr * .4), (sx - bh, y0 + bh + rr * .4)], fill=col)
    # 우표
    sw, sh = pw * 0.24, ph * 0.38; sx, sy = x1 - sw - pw * 0.06, y0 + ph * 0.17
    d.rectangle([sx, sy, sx + sw, sy + sh], fill=(200, 20, 45, 255))
    k = sw / 7
    for i in range(8):  # 톱니
        for (px, py) in [(sx + i * k, sy), (sx + i * k, sy + sh)]:
            d.ellipse([px - k * .28, py - k * .28, px + k * .28, py + k * .28], fill=(255, 253, 247, 255))
    for i in range(1, 11):
        for (px, py) in [(sx, sy + i * sh / 11), (sx + sw, sy + i * sh / 11)]:
            d.ellipse([px - k * .28, py - k * .28, px + k * .28, py + k * .28], fill=(255, 253, 247, 255))
    d.rectangle([sx + k * .7, sy + k * .7, sx + sw - k * .7, sy + sh - k * .7], fill=(255, 236, 220, 255))
    cherry(d, sx + sw * 0.33, sy + sh * 0.66, sw * 0.13)
    # 소인 (둥근 도장 + 물결)
    oc = (90, 70, 60, 170); ox, oy, orr = sx - sw * 0.05, sy + sh * 0.95, sw * 0.3
    d.ellipse([ox - orr, oy - orr, ox + orr, oy + orr], outline=oc, width=max(2, int(W * .006)))
    for j in range(3):
        yy = oy - orr * 0.4 + j * orr * 0.4
        d.line([(ox + orr * 0.5 + t * pw * 0.012, yy + math.sin(t * .9) * orr * .08) for t in range(14)], fill=oc, width=max(2, int(W * .005)))
    # 글줄 (손글씨 줄)
    for j, wf in enumerate([0.36, 0.40, 0.30]):
        yy = y0 + ph * (0.36 + j * 0.17)
        d.rounded_rectangle([x0 + pw * 0.08, yy, x0 + pw * (0.08 + wf), yy + ph * 0.05], int(ph * .025), fill=(179, 19, 43, 255) if j == 0 else (200, 175, 150, 255))
    # 기울이고 그림자
    L = L.rotate(-7, resample=Image.BICUBIC, center=(c, c))
    a = L.split()[3]
    sm = a.point(lambda v: 90 if v > 10 else 0).filter(ImageFilter.GaussianBlur(W * .02))
    sh_l = Image.new('L', (W, W), 0); sh_l.paste(sm, (0, int(W * .025)))
    im.paste((120, 60, 30), (0, 0), sh_l)
    im.paste(L, (0, 0), L)
    return im.resize((S, S), Image.LANCZOS)


# ── 브리핑 (신문 + 해) ───────────────────────────────────
def brief(S, scale=1.0):
    W = S * 4; im = grad(W, (255, 229, 138), (237, 181, 46)); c = W / 2
    glow(im, [c - W * .45, c - W * .5, c + W * .45, c + W * .2], (255, 248, 210), 120, W * .08)
    d = ImageDraw.Draw(im)
    # 해 (신문 뒤 위쪽)
    sx, sy, sr = c + W * 0.15 * scale, c - W * 0.16 * scale, W * 0.15 * scale
    for i in range(12):
        a = math.radians(i * 30)
        d.line([(sx + math.cos(a) * sr * 1.25, sy + math.sin(a) * sr * 1.25), (sx + math.cos(a) * sr * 1.65, sy + math.sin(a) * sr * 1.65)], fill=(255, 140, 40), width=int(W * .022 * scale))
    d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(255, 120, 40))
    d.ellipse([sx - sr * .8, sy - sr * .8, sx + sr * .8, sy + sr * .8], fill=(255, 150, 60))
    # 신문
    pw, ph = W * 0.56 * scale, W * 0.5 * scale; x0, y0 = c - pw / 2 - W * 0.05 * scale, c - ph / 2 + W * 0.08 * scale
    x1, y1 = x0 + pw, y0 + ph; rr = int(W * .025 * scale)

    def paper(dd, o):
        dd.rounded_rectangle([x0, y0 + o, x1, y1 + o], rr, fill=255)
    shadow(im, paper, W * 0.022, W * 0.02, 120, (120, 70, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([x0, y0, x1, y1], rr, fill=(255, 253, 247))
    m = pw * 0.09
    d.rounded_rectangle([x0 + m, y0 + m, x1 - m, y0 + m + ph * 0.13], int(ph * .03), fill=RED)  # 제호 띠
    cherry(d, x1 - m - ph * 0.12, y0 + m + ph * 0.075, ph * 0.035, stem=False)
    # 사진 칸 + 글줄
    py = y0 + m + ph * 0.2
    d.rounded_rectangle([x0 + m, py, x0 + pw * 0.46, py + ph * 0.3], int(ph * .02), fill=(255, 214, 92))
    for j in range(4):
        yy = py + j * ph * 0.08
        d.rounded_rectangle([x0 + pw * 0.52, yy, x1 - m, yy + ph * 0.04], int(ph * .02), fill=(200, 175, 150))
    for j in range(2):
        yy = py + ph * 0.38 + j * ph * 0.09
        d.rounded_rectangle([x0 + m, yy, x1 - m - (pw * 0.18 if j else 0), yy + ph * 0.045], int(ph * .02), fill=(200, 175, 150))
    return im.resize((S, S), Image.LANCZOS)


for name, fn in [('eodiya', eodiya), ('card', card), ('brief', brief)]:
    fn(512).save(f'{out}/{name}-icon-512.png', optimize=True)
    fn(192).save(f'{out}/{name}-icon-192.png', optimize=True)
    fn(180).save(f'{out}/{name}-apple-touch.png', optimize=True)
    fn(512, scale=0.78).save(f'{out}/{name}-icon-maskable-512.png', optimize=True)
print('ok')
