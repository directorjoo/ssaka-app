# 싸바 공짜 이모티콘 100개 만들기 (11-23 대표님: 촌스러운 것 모두 버리고 예쁘고 귀엽고 재미있게, 여러 모양으로)
# 실행: python3 tools/emo_gen.py  → emo/g/e001.gif … e100.gif (목록은 화면에 찍힘 → emo/index.html EMO)
# 캐릭터(곰·고양이·토끼·병아리·돼지·개구리·펭귄·강아지·만두·복숭아·구름·두부·유령·별·하트·주먹밥·달걀·체리)
# × 표정 × 움직임 × 효과(하트·반짝·Zzz·땀·눈물·음표·꽃가루…) × 소품(맥주·커피·전화·꽃·케이크·밥·선물)
import math, json, os, random
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('EMO_OUT') or os.path.join(ROOT, 'emo', 'g')
S = 3; W = 240 * S; N = 12; DUR = 80
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'
OL = (58, 40, 34, 255); OW = 11
CX, CY, R = W // 2, 300, 180  # 몸 가운데·반지름
BASE = CY + R  # 발 닿는 곳(눌림·흔들림 기준)

def rgba(c, a=255): return tuple(c[:3]) + (a,)

def ell(d, cx, cy, rx, ry, fill, w=OW, ol=OL):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill, outline=ol if w else None, width=w)

def poly(d, pts, fill, w=OW):
    d.polygon(pts, fill=fill)
    if w: d.line(pts + [pts[0]], fill=OL, width=w, joint='curve')

def heart_pts(cx, cy, s, n=60):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * s, cy - y * s))
    return pts

def star_pts(cx, cy, ro, ri, rot=-90):
    pts = []
    for i in range(10):
        r = ro if i % 2 == 0 else ri
        a = math.radians(rot + i * 36)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

# ---------- 얼굴 ----------
def face(d, fx, fy, expr, t, sc=1.0, blush=True):
    ex = int(58 * sc); ey = fy
    blink = expr in ('smile', 'tongue_s') and 0.42 < t < 0.5
    k = int(14 * sc)
    def dot_eyes(rr=int(17 * sc)):
        for sx in (-1, 1):
            ell(d, fx + sx * ex, ey, rr, int(rr * 1.15), OL, 0)
            ell(d, fx + sx * ex - rr // 3, ey - rr // 3, rr // 3, rr // 3, (255, 255, 255, 255), 0)
    def arc_eyes(up=True):
        for sx in (-1, 1):
            bx = [fx + sx * ex - 20 * sc, ey - 14 * sc, fx + sx * ex + 20 * sc, ey + 16 * sc]
            d.arc(bx, 200, 340, fill=OL, width=k) if up else d.arc(bx, 20, 160, fill=OL, width=k)
    def mouth_u(w=24, open_=False):
        if open_:
            d.chord([fx - w * sc, ey + 22 * sc, fx + w * sc, ey + 62 * sc], 0, 180, fill=(200, 40, 60, 255), outline=OL, width=int(9 * sc))
        else:
            d.arc([fx - w * sc, ey + 14 * sc, fx + w * sc, ey + 46 * sc], 20, 160, fill=OL, width=int(10 * sc))
    if blush and expr not in ('cool',):
        for sx in (-1, 1):
            ell(d, fx + sx * int(92 * sc), ey + int(30 * sc), int(24 * sc), int(14 * sc), (255, 172, 184, 255), 0)
    if expr == 'smile' or expr == 'tongue_s':
        if blink:
            for sx in (-1, 1): d.line([fx + sx * ex - 16 * sc, ey, fx + sx * ex + 16 * sc, ey], fill=OL, width=k)
        else: dot_eyes()
        mouth_u()
    elif expr == 'happy':
        arc_eyes(); mouth_u(26, True)
    elif expr == 'wink':
        ell(d, fx - ex, ey, int(17 * sc), int(19 * sc), OL, 0); ell(d, fx - ex - 5 * sc, ey - 6 * sc, int(6 * sc), int(6 * sc), (255, 255, 255, 255), 0)
        d.arc([fx + ex - 20 * sc, ey - 14 * sc, fx + ex + 20 * sc, ey + 16 * sc], 200, 340, fill=OL, width=k)
        mouth_u(26, True)
    elif expr == 'love':
        for sx in (-1, 1): poly(d, heart_pts(fx + sx * ex, ey + 4 * sc, 1.9 * sc), (235, 50, 80, 255), 0)
        mouth_u(26, True)
    elif expr == 'cry':
        arc_eyes(False)
        for sx in (-1, 1):
            yy = ey + 14 * sc + ((t * 2) % 1) * 40 * sc
            ell(d, fx + sx * ex, yy, int(9 * sc), int(14 * sc), (110, 190, 255, 255), int(5 * sc))
        d.arc([fx - 22 * sc, ey + 36 * sc, fx + 22 * sc, ey + 64 * sc], 200, 340, fill=OL, width=int(10 * sc))
    elif expr == 'sleepy':
        for sx in (-1, 1): d.line([fx + sx * ex - 18 * sc, ey + 4 * sc, fx + sx * ex + 18 * sc, ey + 4 * sc], fill=OL, width=k)
        ell(d, fx, ey + 40 * sc, int(10 * sc), int(12 * sc), (200, 40, 60, 255), int(7 * sc))
    elif expr == 'shock':
        for sx in (-1, 1):
            ell(d, fx + sx * ex, ey, int(24 * sc), int(28 * sc), (255, 255, 255, 255), int(9 * sc))
            ell(d, fx + sx * ex, ey + 4 * sc, int(10 * sc), int(12 * sc), OL, 0)
        ell(d, fx, ey + 48 * sc, int(16 * sc), int(20 * sc), (200, 40, 60, 255), int(8 * sc))
    elif expr == 'angry':
        dot_eyes(int(15 * sc))
        for sx in (-1, 1): d.line([fx + sx * (ex + 22 * sc), ey - 34 * sc, fx + sx * (ex - 18 * sc), ey - 20 * sc], fill=OL, width=k)
        d.arc([fx - 22 * sc, ey + 30 * sc, fx + 22 * sc, ey + 58 * sc], 200, 340, fill=OL, width=int(10 * sc))
    elif expr == 'sad':
        dot_eyes(int(15 * sc))
        for sx in (-1, 1): d.line([fx + sx * (ex + 20 * sc), ey - 22 * sc, fx + sx * (ex - 16 * sc), ey - 34 * sc], fill=OL, width=int(9 * sc))
        d.arc([fx - 20 * sc, ey + 32 * sc, fx + 20 * sc, ey + 58 * sc], 200, 340, fill=OL, width=int(10 * sc))
    elif expr == 'cool':
        for sx in (-1, 1): d.rounded_rectangle([fx + sx * ex - 36 * sc, ey - 22 * sc, fx + sx * ex + 36 * sc, ey + 20 * sc], radius=int(14 * sc), fill=(30, 30, 40, 255))
        d.line([fx - 24 * sc, ey - 8 * sc, fx + 24 * sc, ey - 8 * sc], fill=(30, 30, 40, 255), width=int(10 * sc))
        for sx in (-1, 1): d.line([fx + sx * ex - 22 * sc, ey - 12 * sc, fx + sx * ex - 8 * sc, ey - 12 * sc], fill=(255, 255, 255, 200), width=int(6 * sc))
        d.arc([fx - 26 * sc, ey + 18 * sc, fx + 30 * sc, ey + 50 * sc], 10, 150, fill=OL, width=int(10 * sc))
    elif expr == 'tongue':
        arc_eyes()
        d.arc([fx - 26 * sc, ey + 12 * sc, fx + 26 * sc, ey + 44 * sc], 20, 160, fill=OL, width=int(10 * sc))
        d.chord([fx - 4 * sc, ey + 30 * sc, fx + 26 * sc, ey + 66 * sc], 0, 180, fill=(255, 110, 130, 255), outline=OL, width=int(7 * sc))
    elif expr == 'proud':
        arc_eyes()
        d.arc([fx - 26 * sc, ey + 12 * sc, fx + 26 * sc, ey + 44 * sc], 20, 160, fill=OL, width=int(10 * sc))
    elif expr == 'dizzy':
        for sx in (-1, 1):
            c = fx + sx * ex
            d.line([c - 16 * sc, ey - 16 * sc, c + 16 * sc, ey + 16 * sc], fill=OL, width=k)
            d.line([c - 16 * sc, ey + 16 * sc, c + 16 * sc, ey - 16 * sc], fill=OL, width=k)
        d.line([fx - 22 * sc, ey + 44 * sc, fx - 8 * sc, ey + 36 * sc, fx + 8 * sc, ey + 44 * sc, fx + 22 * sc, ey + 36 * sc], fill=OL, width=int(9 * sc), joint='curve')

# ---------- 캐릭터 ----------
def char(kind, expr, t):
    L = Image.new('RGBA', (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    fy = CY + 10; sc = 1.0
    if kind == 'bear':
        for sx in (-1, 1): ell(d, CX + sx * 140, CY - 135, 56, 56, (176, 116, 74, 255)); ell(d, CX + sx * 140, CY - 135, 28, 28, (230, 180, 140, 255), 0)
        ell(d, CX, CY, R, R - 8, (176, 116, 74, 255)); ell(d, CX, CY + 60, 80, 56, (240, 205, 170, 255), 0)
        ell(d, CX, CY + 36, 22, 15, OL, 0); fy = CY - 20
    elif kind == 'cat':
        for sx in (-1, 1): poly(d, [(CX + sx * 70, CY - 140), (CX + sx * 170, CY - 210), (CX + sx * 168, CY - 60)], (252, 205, 140, 255))
        ell(d, CX, CY, R, R - 14, (252, 205, 140, 255))
        for sx in (-1, 1): poly(d, [(CX + sx * 92, CY - 146), (CX + sx * 150, CY - 178), (CX + sx * 148, CY - 104)], (255, 160, 170, 255), 0)
        for sx in (-1, 1):
            for dy in (-10, 14): d.line([CX + sx * 120, CY + 40 + dy, CX + sx * 205, CY + 30 + dy * 2], fill=OL, width=6)
        for i in range(3): d.line([CX - 30 + i * 30, CY - 170, CX - 30 + i * 30, CY - 130], fill=(220, 150, 80, 255), width=10)
    elif kind == 'bunny':
        for sx in (-1, 1):
            ell(d, CX + sx * 70, CY - 170, 42, 96, (255, 252, 250, 255)); ell(d, CX + sx * 70, CY - 166, 19, 64, (255, 175, 190, 255), 0)
        ell(d, CX, CY + 10, R, R - 18, (255, 252, 250, 255)); fy = CY + 10
    elif kind == 'chick':
        d.line([CX, CY - 175, CX - 20, CY - 225], fill=OL, width=10); d.line([CX, CY - 175, CX + 24, CY - 220], fill=OL, width=10)
        ell(d, CX, CY, R, R, (255, 214, 64, 255))
        for sx in (-1, 1): ell(d, CX + sx * 178, CY + 50, 30, 50, (255, 196, 40, 255))
        poly(d, [(CX - 26, CY + 22), (CX + 26, CY + 22), (CX, CY + 56)], (255, 140, 40, 255), 7); fy = CY - 10
    elif kind == 'pig':
        for sx in (-1, 1): poly(d, [(CX + sx * 80, CY - 150), (CX + sx * 160, CY - 190), (CX + sx * 150, CY - 90)], (255, 176, 190, 255))
        ell(d, CX, CY, R, R - 14, (255, 186, 198, 255)); ell(d, CX, CY + 54, 58, 40, (255, 150, 170, 255))
        for sx in (-1, 1): ell(d, CX + sx * 20, CY + 54, 10, 15, OL, 0)
        fy = CY - 30
    elif kind == 'frog':
        for sx in (-1, 1): ell(d, CX + sx * 92, CY - 140, 64, 60, (128, 204, 96, 255))
        ell(d, CX, CY + 10, R + 10, R - 30, (128, 204, 96, 255)); ell(d, CX, CY + 80, 110, 60, (200, 236, 160, 255), 0)
        for sx in (-1, 1): ell(d, CX + sx * 92, CY - 140, 34, 34, (255, 255, 255, 255), 6)
        fy = CY - 140; sc = 1.35
    elif kind == 'penguin':
        ell(d, CX, CY + 10, R - 10, R + 10, (44, 62, 100, 255)); ell(d, CX, CY + 50, R - 60, R - 40, (255, 255, 255, 255), 0)
        for sx in (-1, 1): ell(d, CX + sx * 170, CY + 60, 28, 70, (44, 62, 100, 255))
        poly(d, [(CX - 26, CY + 10), (CX + 26, CY + 10), (CX, CY + 44)], (255, 160, 40, 255), 7); fy = CY - 30
    elif kind == 'puppy':
        ell(d, CX, CY, R, R - 10, (244, 214, 168, 255))
        for sx in (-1, 1): ell(d, CX + sx * 168, CY - 30, 52, 110, (170, 112, 72, 255))
        ell(d, CX + 70, CY - 70, 46, 40, (230, 190, 140, 255), 0)
        ell(d, CX, CY + 40, 20, 14, OL, 0); fy = CY - 20
    elif kind == 'mandu':
        d.pieslice([CX - R - 30, CY - 150, CX + R + 30, CY + 330], 180, 360, fill=(252, 246, 234, 255), outline=OL, width=OW)
        d.line([CX - R - 24, CY + 90, CX + R + 24, CY + 90], fill=OL, width=OW)
        for i in range(-2, 3): d.arc([CX + i * 46 - 28, CY - 160, CX + i * 46 + 28, CY - 80], 200, 340, fill=OL, width=8)
        fy = CY + 10
    elif kind == 'peach':
        poly(d, heart_pts(CX, CY + 10, 11.5), (255, 196, 176, 255))
        d.arc([CX - 60, CY - 160, CX + 20, CY + 40], 300, 30, fill=(240, 140, 130, 255), width=8)
        ell(d, CX + 50, CY - 170, 50, 26, (110, 180, 80, 255)); fy = CY - 10
    elif kind == 'cloud':
        for (x, y, r) in [(-110, 30, 90), (110, 30, 90), (-50, -40, 100), (60, -50, 95), (0, 50, 120)]: ell(d, CX + x, CY + y, r, r, (255, 255, 255, 255))
        for (x, y, r) in [(-110, 30, 90), (110, 30, 90), (-50, -40, 100), (60, -50, 95), (0, 50, 120)]: ell(d, CX + x, CY + y, r - OW // 2 - 1, r - OW // 2 - 1, (255, 255, 255, 255), 0)
        fy = CY + 10
    elif kind == 'tofu':
        d.rounded_rectangle([CX - 175, CY - 160, CX + 175, CY + 175], radius=70, fill=(255, 252, 240, 255), outline=OL, width=OW); fy = CY
    elif kind == 'ghost':
        pts = [(CX - 170, CY + 160)]
        for i in range(7): pts.append((CX - 170 + i * 340 / 6, CY + (190 if i % 2 else 150)))
        pts += [(CX + 170, CY - 20)]
        d.pieslice([CX - 170, CY - 200, CX + 170, CY + 140], 180, 360, fill=(250, 250, 255, 255))
        d.polygon([(CX - 170, CY - 30), (CX + 170, CY - 30)] + pts[::-1][1:], fill=(250, 250, 255, 255))
        d.arc([CX - 170, CY - 200, CX + 170, CY + 140], 180, 360, fill=OL, width=OW)
        d.line([(CX - 170, CY - 30)] + pts[:-1] + [(CX + 170, CY - 30)], fill=OL, width=OW, joint='curve')
        fy = CY - 10
    elif kind == 'star':
        poly(d, star_pts(CX, CY + 10, 225, 115), (255, 212, 60, 255)); fy = CY + 20; sc = 0.85
    elif kind == 'heart':
        poly(d, heart_pts(CX, CY + 10, 12.5), (255, 92, 120, 255)); fy = CY - 10
    elif kind == 'onigiri':
        poly(d, [(CX, CY - 200), (CX + 200, CY + 160), (CX - 200, CY + 160)], (255, 255, 255, 255))
        d.rectangle([CX - 80, CY + 90, CX + 80, CY + 165], fill=(40, 60, 50, 255)); fy = CY + 10; sc = 0.85
    elif kind == 'egg':
        pts = [(CX + (200 + 18 * math.sin(i * 1.7)) * math.cos(2 * math.pi * i / 24), CY + 40 + (150 + 14 * math.cos(i * 2.3)) * math.sin(2 * math.pi * i / 24)) for i in range(24)]
        poly(d, pts, (255, 255, 255, 255)); ell(d, CX, CY + 20, 120, 115, (255, 196, 40, 255)); fy = CY + 10; sc = 0.8
    elif kind == 'cherry':
        d.line([CX - 70, CY - 30, CX + 10, CY - 230], fill=(100, 70, 30, 255), width=12)
        d.line([CX + 110, CY + 20, CX + 10, CY - 230], fill=(100, 70, 30, 255), width=12)
        ell(d, CX + 34, CY - 230, 54, 24, (90, 170, 70, 255))
        ell(d, CX + 120, CY + 60, 92, 92, (196, 22, 50, 255)); ell(d, CX - 60, CY + 30, R - 20, R - 20, (220, 30, 60, 255))
        ell(d, CX - 120, CY - 50, 26, 16, (255, 236, 240, 255), 0)
        fy = CY + 20; sc = 0.85
        face(d, CX - 60, fy, expr, t, sc); return L
    face(d, CX, fy, expr, t, sc)
    return L

# ---------- 소품 ----------
def prop(d, kind, t):
    x, y = CX + 180, CY + 90
    sw = 6 * math.sin(2 * math.pi * t)
    if kind == 'beer':
        d.rounded_rectangle([x - 50, y - 70 + sw, x + 40, y + 70 + sw], radius=14, fill=(255, 190, 40, 255), outline=OL, width=9)
        for (a, b, r) in [(-40, -76, 26), (-5, -84, 30), (30, -76, 24)]: ell(d, x + a, y + b + sw, r, r, (255, 255, 255, 255), 7)
        d.arc([x + 22, y - 40 + sw, x + 80, y + 30 + sw], 270, 90, fill=OL, width=12)
    elif kind == 'coffee':
        d.rounded_rectangle([x - 50, y - 50, x + 40, y + 60], radius=16, fill=(255, 255, 255, 255), outline=OL, width=9)
        d.rectangle([x - 44, y - 10, x + 34, y + 20], fill=(150, 90, 60, 255))
        for i in (-20, 10): d.arc([x + i - 14, y - 120 + sw * 2, x + i + 14, y - 66 + sw * 2], 90, 270, fill=(170, 170, 170, 255), width=7)
    elif kind == 'phone':
        d.rounded_rectangle([x - 40, y - 80 + sw, x + 40, y + 70 + sw], radius=16, fill=(60, 60, 70, 255), outline=OL, width=8)
        d.rectangle([x - 28, y - 62 + sw, x + 28, y + 46 + sw], fill=(150, 210, 255, 255))
        if (t * 4) % 1 < .5:
            for r in (60, 90): d.arc([x - r, y - r - 20, x + r, y + r - 20], 300, 340, fill=(235, 60, 80, 255), width=8)
    elif kind == 'flower':
        d.line([x, y + 80, x, y - 20], fill=(80, 160, 70, 255), width=10)
        for i in range(5): a = 2 * math.pi * i / 5 + t; ell(d, x + 30 * math.cos(a), y - 40 + 30 * math.sin(a), 24, 24, (255, 140, 180, 255), 6)
        ell(d, x, y - 40, 18, 18, (255, 220, 60, 255), 6)
    elif kind == 'cake':
        d.rounded_rectangle([x - 70, y - 20, x + 60, y + 70], radius=12, fill=(255, 240, 220, 255), outline=OL, width=8)
        d.rectangle([x - 64, y - 14, x + 54, y + 4], fill=(255, 140, 170, 255))
        d.line([x, y - 20, x, y - 70], fill=OL, width=10)
        fl = 1 + 0.25 * math.sin(2 * math.pi * t * 3); ell(d, x, y - 88, 12 * fl, 20 * fl, (255, 170, 40, 255), 0)
    elif kind == 'bowl':
        d.chord([x - 80, y - 40, x + 70, y + 80], 0, 180, fill=(220, 70, 60, 255), outline=OL, width=8)
        for i in range(-2, 3): ell(d, x + i * 24 - 5, y + 14, 22, 16, (255, 255, 255, 255), 5)
        for i in (-20, 15): d.arc([x + i - 14, y - 80 + sw * 2, x + i + 14, y - 26 + sw * 2], 90, 270, fill=(190, 190, 190, 255), width=7)
    elif kind == 'gift':
        d.rectangle([x - 60, y - 30 + sw, x + 50, y + 70 + sw], fill=(90, 160, 240, 255), outline=OL, width=8)
        d.rectangle([x - 12, y - 30 + sw, x + 2, y + 70 + sw], fill=(255, 220, 60, 255))
        for sx in (-1, 1): ell(d, x - 5 + sx * 26, y - 46 + sw, 26, 16, (255, 220, 60, 255), 7)

# ---------- 효과 ----------
def fx(d, kind, t, rnd):
    if kind == 'hearts':
        for i in range(4):
            p = (t + i / 4) % 1; x = CX - 230 + i * 150 + 20 * math.sin(p * 6); y = 520 - p * 470
            poly(d, heart_pts(x, y, 2.0 + 1.2 * (1 - p)), (255, 80, 110, int(255 * (1 - p * .6))), 0)
    elif kind == 'sparkle':
        for i, (x, y) in enumerate([(110, 120), (610, 140), (90, 430), (640, 420), (360, 60)]):
            s = abs(math.sin(math.pi * (t * 2 + i * .37))); poly(d, star_pts(x, y, 44 * s + 6, 14 * s + 2), (255, 210, 50, 255), 0)
    elif kind == 'zzz':
        f = ImageFont.truetype(FONT, 70, index=1)
        for i in range(3):
            p = (t + i / 3) % 1
            d.text((520 + p * 90, 230 - p * 200), 'Z', font=ImageFont.truetype(FONT, int(50 + 40 * p), index=1), fill=(90, 120, 200, int(255 * (1 - p))), stroke_width=4, stroke_fill=(255, 255, 255, 255))
    elif kind == 'sweat':
        p = (t * 1.5) % 1; ell(d, CX + 165, CY - 120 + p * 60, 22, 32, (120, 200, 255, 255), 7)
    elif kind == 'notes':
        for i in range(3):
            p = (t + i / 3) % 1; x = 100 + i * 240 + 30 * math.sin(p * 6); y = 380 - p * 330
            c = [(255, 90, 120), (90, 160, 255), (255, 180, 40)][i]
            ell(d, x, y, 22, 17, rgba(c), 0); d.line([x + 18, y, x + 18, y - 70], fill=rgba(c), width=9); d.line([x + 18, y - 70, x + 46, y - 52], fill=rgba(c), width=9)
    elif kind == 'confetti':
        for i in range(18):
            r = random.Random(rnd + i); x = r.randint(30, W - 30); sp = r.uniform(.6, 1.2); y = ((r.random() + t * sp) % 1) * (W - 100) - 40
            c = r.choice([(255, 90, 120), (90, 160, 255), (255, 200, 40), (120, 210, 120), (190, 120, 255)])
            a = (t * 8 + i) % 6.28
            d.polygon([(x + 16 * math.cos(a), y + 8 * math.sin(a)), (x - 16 * math.cos(a), y - 8 * math.sin(a)), (x - 16 * math.cos(a) + 8, y - 8 * math.sin(a) + 12), (x + 16 * math.cos(a) + 8, y + 8 * math.sin(a) + 12)], fill=rgba(c))
    elif kind == 'question':
        f = ImageFont.truetype(FONT, int(130 + 20 * math.sin(2 * math.pi * t)), index=1)
        d.text((560, 40), '?', font=f, fill=(90, 120, 220, 255), stroke_width=7, stroke_fill=(255, 255, 255, 255))
    elif kind == 'bang':
        f = ImageFont.truetype(FONT, int(130 + 25 * abs(math.sin(2 * math.pi * t * 2))), index=1)
        d.text((560, 30), '!', font=f, fill=(240, 60, 60, 255), stroke_width=7, stroke_fill=(255, 255, 255, 255))
        d.text((620, 60), '!', font=ImageFont.truetype(FONT, 100, index=1), fill=(240, 60, 60, 255), stroke_width=7, stroke_fill=(255, 255, 255, 255))
    elif kind == 'rain':
        for i in range(10):
            r = random.Random(rnd + i); x = r.randint(30, W - 30); y = ((r.random() + t * 1.5) % 1) * 600 - 60
            d.line([x, y, x - 8, y + 34], fill=(100, 170, 255, 220), width=8)
    elif kind == 'sun':
        cx, cy = 600, 110
        for i in range(10):
            a = 2 * math.pi * i / 10 + t * 1.2; d.line([cx + 70 * math.cos(a), cy + 70 * math.sin(a), cx + 100 * math.cos(a), cy + 100 * math.sin(a)], fill=(255, 170, 30, 255), width=10)
        ell(d, cx, cy, 52, 52, (255, 200, 40, 255), 7)
    elif kind == 'fire':
        for i, x in enumerate((110, 610)):
            h = 1 + .2 * math.sin(2 * math.pi * (t * 2 + i * .5))
            poly(d, [(x, 380 - 140 * h), (x + 50, 330), (x + 40, 420), (x - 40, 420), (x - 50, 330)], (255, 110, 40, 255), 6)
            poly(d, [(x, 400 - 70 * h), (x + 22, 380), (x + 18, 418), (x - 18, 418), (x - 22, 380)], (255, 220, 60, 255), 0)
    elif kind == 'flowers':
        for i in range(6):
            p = (t + i / 6) % 1; x = 60 + i * 120; y = 80 + p * 420; a = p * 6
            for j in range(5): ell(d, x + 14 * math.cos(a + j * 1.256), y + 14 * math.sin(a + j * 1.256), 11, 11, (255, 170, 200, 230), 0)
            ell(d, x, y, 7, 7, (255, 230, 90, 255), 0)
    elif kind == 'stars':
        for i in range(5):
            a = 2 * math.pi * (i / 5 + t); x = CX + 230 * math.cos(a); y = 140 + 50 * math.sin(a)
            poly(d, star_pts(x, y, 26, 11), (255, 210, 50, 255), 5)
    elif kind == 'steam':
        for i in range(3):
            p = (t + i / 3) % 1; ell(d, CX - 220 + i * 40, CY - 140 - p * 120, 24 + 20 * p, 24 + 20 * p, (225, 225, 232, 255), 0)
            ell(d, CX + 220 - i * 40, CY - 140 - p * 120, 24 + 20 * p, 24 + 20 * p, (225, 225, 232, 255), 0)
    elif kind == 'thumbs':
        x, y = CX + 190, CY + 40 - 14 * abs(math.sin(2 * math.pi * t))
        d.rounded_rectangle([x - 45, y - 10, x + 45, y + 80], radius=24, fill=(255, 210, 160, 255), outline=OL, width=8)
        d.rounded_rectangle([x - 22, y - 90, x + 14, y + 10], radius=18, fill=(255, 210, 160, 255), outline=OL, width=8)
    elif kind == 'speed':
        for i in range(5): y = 160 + i * 70; xo = ((t * 3 + i * .3) % 1) * 80; d.line([20 + xo, y, 140 + xo, y], fill=(120, 120, 140, 200), width=9)
    elif kind == 'snow':
        for i in range(14):
            r = random.Random(rnd + i); x = r.randint(30, W - 30) + 20 * math.sin(t * 6 + i); y = ((r.random() + t * .8) % 1) * 640 - 40
            ell(d, x, y, 12, 12, (255, 255, 255, 255), 4)

# ---------- 움직임 ----------
def motion(m, t):
    s = math.sin(2 * math.pi * t)
    if m == 'bounce': h = abs(math.sin(math.pi * t)); return (0, -70 * h, 1 + .1 * (1 - h) ** 3, 1 - .1 * (1 - h) ** 3, 0)
    if m == 'wobble': return (0, 0, 1, 1, 9 * s)
    if m == 'shake': return (14 * math.sin(2 * math.pi * t * 3), 0, 1, 1, 0)
    if m == 'pulse': return (0, 0, 1 + .07 * s, 1 + .07 * s, 0)
    if m == 'float': return (0, -18 * s, 1, 1, 4 * math.sin(2 * math.pi * t + 1))
    if m == 'hop': h = abs(math.sin(2 * math.pi * t)); return (0, -45 * h, 1, 1, 0)
    if m == 'nod': return (0, 12 * abs(s), 1, 1 - .05 * abs(s), 0)
    if m == 'squish': return (0, 0, 1 + .09 * s, 1 - .09 * s, 0)
    if m == 'slide': return (40 * s, 0, 1, 1, -6 * s)
    if m == 'tilt': return (0, 0, 1, 1, 14 if t < .5 else -14)
    if m == 'sway': return (20 * s, -8 * abs(s), 1, 1, 6 * s)
    if m == 'shiver': return (6 * math.sin(2 * math.pi * t * 6), 0, 1, 1, 2 * math.sin(2 * math.pi * t * 6))
    return (0, 0, 1, 1, 0)

def place(layer, m, t):
    dx, dy, sx, sy, ang = motion(m, t)
    L = layer
    if sx != 1 or sy != 1:
        nw, nh = int(W * sx), int(W * sy)
        L2 = L.resize((nw, nh), Image.BICUBIC)
        L = Image.new('RGBA', (W, W), (0, 0, 0, 0)); L.paste(L2, (int(CX - CX * sx), int(BASE - BASE * sy)), L2)
    if ang: L = L.rotate(ang, Image.BICUBIC, center=(CX, BASE))
    if dx or dy:
        L3 = Image.new('RGBA', (W, W), (0, 0, 0, 0)); L3.paste(L, (int(dx), int(dy)), L); L = L3
    return L

def caption(img, text, color):
    d = ImageDraw.Draw(img)
    size = 120
    while size > 50:
        f = ImageFont.truetype(FONT, size, index=1)
        bb = d.textbbox((0, 0), text, font=f, stroke_width=16)
        if bb[2] - bb[0] <= W - 40: break
        size -= 6
    x = (W - (bb[2] - bb[0])) // 2 - bb[0]; y = W - 30 - (bb[3] - bb[1]) - bb[1]
    d.text((x, y), text, font=f, fill=rgba(color), stroke_width=16, stroke_fill=(255, 255, 255, 255))
    d.text((x, y), text, font=f, fill=rgba(color), stroke_width=7, stroke_fill=OL)
    d.text((x, y), text, font=f, fill=rgba(color))

def make(i, e):
    kind, expr, m, eff, pr, txt, col = e['k'], e['x'], e['m'], e.get('f'), e.get('p'), e['n'], e['c2']
    frames = []
    for j in range(N):
        t = j / N
        img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
        if eff and eff in ('rain', 'snow', 'flowers', 'confetti'): fx(ImageDraw.Draw(img), eff, t, i * 31)
        body = place(char(kind, expr, t), m, t)
        img.alpha_composite(body)
        dd = ImageDraw.Draw(img)
        if pr: prop(dd, pr, t)
        if eff and eff not in ('rain', 'snow', 'flowers', 'confetti'): fx(dd, eff, t, i * 31)
        caption(img, txt, col)
        sm = img.resize((240, 240), Image.LANCZOS)
        a = sm.split()[3].point(lambda v: 255 if v > 110 else 0)
        rgb = Image.new('RGB', sm.size, (255, 255, 255)); rgb.paste(sm.convert('RGB'), mask=sm.split()[3])
        frames.append((rgb, a))
    # 공통 팔레트(255색 + 투명 1)
    big = Image.new('RGB', (240, 240 * N)); [big.paste(f[0], (0, 240 * k)) for k, f in enumerate(frames)]
    pal = big.quantize(colors=255, method=Image.MEDIANCUT, dither=Image.NONE)
    out = []
    for rgb, a in frames:
        q = rgb.quantize(palette=pal, dither=Image.NONE)
        px = q.load(); ap = a.load()
        for yy in range(240):
            for xx in range(240):
                if ap[xx, yy] == 0: px[xx, yy] = 255
        q.info['transparency'] = 255
        out.append(q)
    fn = os.path.join(OUT, 'e%03d.gif' % i)
    out[0].save(fn, save_all=True, append_images=out[1:], duration=DUR, loop=0, transparency=255, disposal=2, optimize=False)

# ---------- 100개 목록 [캐릭터, 표정, 움직임, 효과, 소품, 글씨, 글씨색, 주제] ----------
RED, PINK, BLUE, GRN, ORG, PUR, BRN, YEL = (230, 40, 70), (255, 100, 150), (60, 120, 230), (40, 160, 80), (255, 130, 30), (150, 90, 220), (150, 90, 50), (255, 190, 0)
L = [
 # 💛 인사 12
 ('cherry', 'happy', 'bounce', 'sparkle', None, '싸바 싸바!', RED, '💛 인사'),
 ('bear', 'smile', 'wobble', None, None, '싸바?', BRN, '💛 인사'),
 ('chick', 'happy', 'hop', 'notes', None, '안녕~', ORG, '💛 인사'),
 ('bunny', 'wink', 'sway', 'hearts', None, '좋은 아침!', PINK, '💛 인사'),
 ('cloud', 'sleepy', 'float', 'zzz', None, '굿나잇', BLUE, '💛 인사'),
 ('cat', 'smile', 'tilt', None, None, '뭐 해?', ORG, '💛 인사'),
 ('penguin', 'happy', 'slide', None, None, '반가워!', BLUE, '💛 인사'),
 ('sun_star', 'happy', 'pulse', 'sun', None, '좋은 하루', ORG, '💛 인사'),
 ('puppy', 'tongue', 'hop', None, 'phone', '통화 돼?', BRN, '💛 인사'),
 ('peach', 'smile', 'squish', 'sparkle', None, '잘 지내지?', PINK, '💛 인사'),
 ('ghost', 'happy', 'float', None, None, '짠! 나야', PUR, '💛 인사'),
 ('frog', 'happy', 'hop', None, None, '개굴~ 안녕', GRN, '💛 인사'),
 # 😊 대답 12
 ('bear', 'happy', 'nod', None, None, '응응!', BRN, '😊 대답'),
 ('cat', 'proud', 'pulse', None, None, '오케이', GRN, '😊 대답'),
 ('tofu', 'smile', 'nod', None, None, '알겠어~', BLUE, '😊 대답'),
 ('chick', 'shock', 'shake', 'bang', None, '헐!', RED, '😊 대답'),
 ('pig', 'dizzy', 'wobble', 'question', None, '엥?', PUR, '😊 대답'),
 ('bunny', 'sad', 'shake', None, None, '아니~', BLUE, '😊 대답'),
 ('penguin', 'proud', 'tilt', 'thumbs', None, '좋아요', BLUE, '😊 대답'),
 ('onigiri', 'smile', 'nod', None, None, '그래그래', GRN, '😊 대답'),
 ('frog', 'shock', 'bounce', 'bang', None, '대박!', ORG, '😊 대답'),
 ('mandu', 'wink', 'squish', None, None, '콜!', RED, '😊 대답'),
 ('egg', 'proud', 'wobble', None, None, '당연하지', YEL, '😊 대답'),
 ('ghost', 'shock', 'shiver', None, None, '진짜?!', PUR, '😊 대답'),
 # 😂 감정 14
 ('heart', 'love', 'pulse', 'hearts', None, '사랑해', RED, '😂 감정'),
 ('cat', 'happy', 'shake', None, None, 'ㅋㅋㅋㅋ', ORG, '😂 감정'),
 ('bear', 'cry', 'shiver', None, None, '흑흑…', BLUE, '😂 감정'),
 ('pig', 'angry', 'shake', 'fire', None, '부글부글', RED, '😂 감정'),
 ('bunny', 'love', 'bounce', 'hearts', None, '설레~', PINK, '😂 감정'),
 ('cloud', 'sad', 'float', 'rain', None, '우울해', BLUE, '😂 감정'),
 ('chick', 'cool', 'sway', 'sparkle', None, '멋지지?', ORG, '😂 감정'),
 ('mandu', 'shock', 'shiver', 'sweat', None, '당황…', BLUE, '😂 감정'),
 ('puppy', 'cry', 'nod', None, None, '서운해', BRN, '😂 감정'),
 ('frog', 'tongue', 'wobble', None, None, '메롱~', GRN, '😂 감정'),
 ('peach', 'love', 'squish', 'hearts', None, '좋아해', PINK, '😂 감정'),
 ('tofu', 'dizzy', 'wobble', 'stars', None, '어질어질', PUR, '😂 감정'),
 ('ghost', 'sad', 'float', None, None, '심심해', PUR, '😂 감정'),
 ('cherry', 'love', 'pulse', 'hearts', None, '보고 싶어', RED, '😂 감정'),
 # 🙏 고마움 8
 ('bear', 'happy', 'nod', 'flowers', None, '고마워!', BRN, '🙏 고마움'),
 ('bunny', 'sad', 'nod', None, None, '미안해…', BLUE, '🙏 고마움'),
 ('chick', 'smile', 'nod', 'sparkle', 'flower', '감사합니다', ORG, '🙏 고마움'),
 ('cat', 'cry', 'nod', None, None, '잘못했어', BLUE, '🙏 고마움'),
 ('heart', 'happy', 'pulse', 'sparkle', None, '덕분이야', RED, '🙏 고마움'),
 ('puppy', 'happy', 'hop', 'hearts', 'gift', '선물이야', BRN, '🙏 고마움'),
 ('penguin', 'sad', 'nod', 'sweat', None, '죄송해요', BLUE, '🙏 고마움'),
 ('peach', 'happy', 'bounce', 'flowers', None, '감동이야', PINK, '🙏 고마움'),
 # 🏃 약속 10
 ('chick', 'happy', 'slide', 'speed', None, '가는 중!', ORG, '🏃 약속'),
 ('bear', 'shock', 'shake', 'sweat', None, '늦어서 미안', RED, '🏃 약속'),
 ('cat', 'smile', 'tilt', 'question', None, '어디야?', ORG, '🏃 약속'),
 ('puppy', 'happy', 'hop', None, None, '도착!', GRN, '🏃 약속'),
 ('penguin', 'smile', 'slide', 'speed', None, '거의 다 왔어', BLUE, '🏃 약속'),
 ('frog', 'smile', 'tilt', 'question', None, '언제 봐?', GRN, '🏃 약속'),
 ('bunny', 'happy', 'bounce', 'sparkle', None, '이따 봐!', PINK, '🏃 약속'),
 ('tofu', 'sad', 'nod', None, None, '조금만 기다려', BLUE, '🏃 약속'),
 ('cherry', 'happy', 'sway', None, None, '여기로 와!', RED, '🏃 약속'),
 ('mandu', 'happy', 'hop', None, None, '나왔어~', ORG, '🏃 약속'),
 # 🍻 먹고 마시기 10
 ('bear', 'happy', 'wobble', None, 'beer', '한잔 콜?', ORG, '🍻 먹고 마시기'),
 ('cat', 'smile', 'sway', 'steam', 'coffee', '커피 한잔', BRN, '🍻 먹고 마시기'),
 ('pig', 'happy', 'bounce', None, 'bowl', '밥 먹자!', RED, '🍻 먹고 마시기'),
 ('mandu', 'love', 'squish', 'steam', None, '배고파~', ORG, '🍻 먹고 마시기'),
 ('onigiri', 'tongue', 'wobble', None, None, '냠냠', GRN, '🍻 먹고 마시기'),
 ('penguin', 'happy', 'sway', None, 'beer', '건배!', ORG, '🍻 먹고 마시기'),
 ('egg', 'happy', 'squish', None, None, '맛있다!', YEL, '🍻 먹고 마시기'),
 ('puppy', 'sleepy', 'nod', None, 'bowl', '배불러', BRN, '🍻 먹고 마시기'),
 ('frog', 'dizzy', 'wobble', 'stars', 'beer', '취했다~', PUR, '🍻 먹고 마시기'),
 ('bunny', 'smile', 'tilt', None, 'coffee', '카페 갈래?', PINK, '🍻 먹고 마시기'),
 # 🎉 축하 10
 ('chick', 'happy', 'hop', 'confetti', 'cake', '생일 축하해', RED, '🎉 축하'),
 ('bear', 'happy', 'bounce', 'confetti', None, '축하해!', ORG, '🎉 축하'),
 ('star', 'happy', 'pulse', 'sparkle', None, '최고야!', ORG, '🎉 축하'),
 ('heart', 'love', 'bounce', 'confetti', None, '결혼 축하해', PINK, '🎉 축하'),
 ('cat', 'cool', 'sway', 'confetti', None, '합격 축하!', BLUE, '🎉 축하'),
 ('pig', 'happy', 'hop', 'sparkle', 'gift', '부자 되세요', YEL, '🎉 축하'),
 ('cherry', 'happy', 'bounce', 'confetti', None, '새해 복!', RED, '🎉 축하'),
 ('bunny', 'happy', 'sway', 'flowers', 'flower', '축하드려요', PINK, '🎉 축하'),
 ('penguin', 'proud', 'pulse', 'stars', None, '수고했어', BLUE, '🎉 축하'),
 ('peach', 'wink', 'hop', 'confetti', None, '짝짝짝!', PINK, '🎉 축하'),
 # 👴 가족 8
 ('bear', 'smile', 'nod', 'hearts', None, '엄마 사랑해', RED, '👴 가족'),
 ('puppy', 'happy', 'hop', 'hearts', None, '아빠 최고', BLUE, '👴 가족'),
 ('chick', 'smile', 'sway', None, 'bowl', '밥은 먹었니?', ORG, '👴 가족'),
 ('bunny', 'smile', 'nod', None, None, '건강하세요', GRN, '👴 가족'),
 ('cat', 'sad', 'float', None, None, '보고 싶어요', PINK, '👴 가족'),
 ('pig', 'happy', 'bounce', 'sparkle', None, '용돈 주세요~', YEL, '👴 가족'),
 ('penguin', 'smile', 'tilt', None, 'phone', '전화 드릴게요', BLUE, '👴 가족'),
 ('heart', 'happy', 'pulse', 'hearts', None, '우리 가족 사랑', RED, '👴 가족'),
 # 💪 응원 8
 ('cherry', 'proud', 'bounce', 'fire', None, '힘내!', RED, '💪 응원'),
 ('bear', 'cool', 'pulse', 'thumbs', None, '할 수 있어', ORG, '💪 응원'),
 ('star', 'happy', 'bounce', 'sparkle', None, '파이팅!', ORG, '💪 응원'),
 ('chick', 'proud', 'hop', 'fire', None, '아자아자!', RED, '💪 응원'),
 ('frog', 'smile', 'nod', 'thumbs', None, '잘했어!', GRN, '💪 응원'),
 ('tofu', 'proud', 'pulse', 'sparkle', None, '넌 최고야', BLUE, '💪 응원'),
 ('bunny', 'happy', 'sway', 'hearts', None, '응원해!', PINK, '💪 응원'),
 ('cloud', 'smile', 'float', 'sun', None, '다 잘될 거야', BLUE, '💪 응원'),
 # 🗣️ 사투리 4
 ('bear', 'happy', 'wobble', None, None, '겁나 좋아잉', BRN, '🗣️ 사투리'),
 ('pig', 'tongue', 'shake', None, None, '오메 오메!', RED, '🗣️ 사투리'),
 ('cat', 'smile', 'tilt', 'question', None, '뭐 하요?', ORG, '🗣️ 사투리'),
 ('mandu', 'happy', 'nod', None, None, '그라제~', GRN, '🗣️ 사투리'),
 # ☔ 날씨·일상 4
 ('cloud', 'sad', 'float', 'rain', None, '비 온다', BLUE, '☔ 날씨·일상'),
 ('penguin', 'shock', 'shiver', 'snow', None, '추워~', BLUE, '☔ 날씨·일상'),
 ('puppy', 'sleepy', 'nod', 'zzz', None, '졸려…', PUR, '☔ 날씨·일상'),
 ('tofu', 'dizzy', 'shiver', 'sweat', None, '퇴근하고 싶다', BRN, '☔ 날씨·일상'),
]

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    only = os.environ.get('ONLY')
    if not only:
        for f in os.listdir(OUT):
            if f.endswith('.gif'): os.remove(os.path.join(OUT, f))
    items = []
    for i, row in enumerate(L, 1):
        k, x, m, f, p, n, c, cat = row
        if k == 'sun_star': k = 'star'
        if only and str(i) not in only.split(','): continue
        make(i, {'k': k, 'x': x, 'm': m, 'f': f, 'p': p, 'n': n, 'c2': c})
        items.append({'id': 'e%03d' % i, 'n': n, 'c': cat})
    if not only:
        print(json.dumps(items, ensure_ascii=False))  # emo/index.html의 EMO 목록에 붙여 넣기
    print(len(L), 'rows,', len(items), 'made')
