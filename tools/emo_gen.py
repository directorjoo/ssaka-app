# 싸바 공짜 이모티콘 100개 (v3, 11-23 대표님: '성의 없이 그려짐 → 자료 찾아보고 다시')
# 참고한 것: 카카오 인기 이모티콘(옴팡이·몽실토끼 등)은 머리와 몸 비율 1:1에 가까운 아기 캐릭터 + 큰 동작 + 과장된 표정
# → 머리·몸·팔·발이 있는 캐릭터 7가지(체리·곰·토끼·고양이·병아리·강아지·개구리)가 문구마다 다른 '동작'을 함
#   (손 흔들기·인사·점프 만세·달리기·박수·엄지 척·X 팔·눈물 훔치기·발 구르기·건배·마시기·먹기·전화·잠·덜덜·데굴데굴…)
#   + 표정 15가지 + 소품(맥주·커피·전화·꽃다발·케이크·선물·밥그릇·우산·큰 하트) + 머리 장식(왕관·고깔·머리띠·학사모·수면모자·목도리)
#   + 효과(하트·반짝·꽃가루·Zzz·땀·음표·김·불꽃·비·눈·속도선·꽃·?·!·빙글 별·해·먼지·동전·전화 울림·짝!·먹구름)
# 실행: python3 tools/emo_gen.py → emo/g/e001.gif … e100.gif (260px 투명 움직이는 GIF, 16장 0.07초, 흰 스티커 테두리)
#      ONLY=1,5,9 python3 tools/emo_gen.py → 몇 개만 / SHEET=1 → /tmp/emo_sheet.png 한눈에 보기
# 글꼴: tools/fonts/Jua-Regular.ttf (구글 폰트 OFL)
import math, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('EMO_OUT') or os.path.join(ROOT, 'emo', 'g')
FONT = os.path.join(ROOT, 'tools', 'fonts', 'Jua-Regular.ttf')
PAL = int(os.environ.get('PAL', 72)); FIN = 260; S = 3; C = FIN * S; NF = 16; DUR = 70
CX, BASE = C // 2, 560          # 발 닿는 곳
ZOOM = 0.84                     # 캐릭터 크기(효과·장식 자리 남김)
OL = (61, 41, 36, 255); OW = 10
WHITE = (255, 255, 255, 255)
TAU = math.pi * 2

def ell(d, cx, cy, rx, ry, fill, w=OW, ol=OL):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill, outline=ol if w else None, width=w)

def poly(d, pts, fill, w=OW):
    d.polygon(pts, fill=fill)
    if w: d.line(list(pts) + [pts[0], pts[1]], fill=OL, width=w, joint='curve')

def cap(d, p1, p2, w, fill, ol=True):
    if ol:
        d.line([p1, p2], fill=OL, width=w + 2 * OW)
        for p in (p1, p2): ell(d, p[0], p[1], w / 2 + OW, w / 2 + OW, OL, 0)
    d.line([p1, p2], fill=fill, width=w)
    for p in (p1, p2): ell(d, p[0], p[1], w / 2, w / 2, fill, 0)

def heart_pts(cx, cy, s, n=48, rot=0):
    pts = []; ca, sa = math.cos(rot), math.sin(rot)
    for i in range(n):
        t = TAU * i / n
        x = 16 * math.sin(t) ** 3; y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((cx + (x * ca - y * sa) * s, cy + (x * sa + y * ca) * s))
    return pts

def star_pts(cx, cy, ro, ri, rot=-90, n=5):
    return [(cx + (ro if i % 2 == 0 else ri) * math.cos(math.radians(rot + i * 180 / n)),
             cy + (ro if i % 2 == 0 else ri) * math.sin(math.radians(rot + i * 180 / n))) for i in range(n * 2)]

def lerp(a, b, k): return a + (b - a) * k
def ease(k): return 0.5 - 0.5 * math.cos(math.pi * max(0, min(1, k)))

# ---------- 캐릭터 ----------
SP = {
    'cherry': dict(c=(226, 38, 62, 255), b=(226, 38, 62, 255), belly=None, cheek=(255, 150, 160, 255)),
    'bear':   dict(c=(184, 124, 80, 255), b=(184, 124, 80, 255), belly=(243, 218, 184, 255), cheek=(255, 150, 150, 255)),
    'bunny':  dict(c=(255, 255, 255, 255), b=(255, 255, 255, 255), belly=None, cheek=(255, 160, 180, 255)),
    'cat':    dict(c=(255, 213, 150, 255), b=(255, 213, 150, 255), belly=(255, 245, 225, 255), cheek=(255, 150, 140, 255)),
    'chick':  dict(c=(255, 214, 64, 255), b=(255, 214, 64, 255), belly=None, cheek=(255, 150, 120, 255)),
    'puppy':  dict(c=(255, 251, 242, 255), b=(255, 251, 242, 255), belly=None, cheek=(255, 160, 170, 255)),
    'frog':   dict(c=(146, 210, 102, 255), b=(146, 210, 102, 255), belly=(222, 242, 186, 255), cheek=(255, 150, 150, 255)),
}
HRX, HRY = 178, 158            # 머리 반지름
HEAD_Y = -318                  # 발 기준 머리 가운데
BODY_Y, BRX, BRY = -98, 118, 104
SH = 82                        # 어깨 x
SHY = -150

def head(d, sp, ox, oy, expr, t, acc):
    """머리(귀·얼굴·장식) — (ox,oy)=머리 가운데"""
    c = SP[sp]['c']
    # 뒤쪽 귀
    if sp == 'bear':
        for sx in (-1, 1): ell(d, ox + sx * 132, oy - 118, 50, 50, c); ell(d, ox + sx * 132, oy - 118, 26, 26, (243, 190, 160, 255), 0)
    elif sp == 'bunny':
        sw = math.sin(TAU * t) * 6
        for sx in (-1, 1):
            ex, ey = ox + sx * 70 + sx * sw, oy - 205
            ell(d, ex, ey, 40, 100, c); ell(d, ex, ey + 8, 18, 70, (255, 186, 200, 255), 0)
    elif sp == 'cat':
        for sx in (-1, 1):
            poly(d, [(ox + sx * 70, oy - 132), (ox + sx * 168, oy - 205), (ox + sx * 160, oy - 70)], c)
            poly(d, [(ox + sx * 96, oy - 128), (ox + sx * 152, oy - 172), (ox + sx * 148, oy - 98)], (255, 180, 170, 255), 0)
    elif sp == 'frog':
        for sx in (-1, 1): ell(d, ox + sx * 92, oy - 120, 70, 66, c)
    elif sp == 'chick':
        d.line([(ox, oy - 150), (ox - 18, oy - 205)], fill=OL, width=12); d.line([(ox, oy - 150), (ox + 22, oy - 200)], fill=OL, width=12)
    elif sp == 'cherry':
        d.arc([ox - 10, oy - 260, ox + 150, oy - 110], 180, 265, fill=(110, 70, 40, 255), width=16)
        lf = [(ox + 20, oy - 230), (ox + 120, oy - 262), (ox + 150, oy - 220), (ox + 70, oy - 198)]
        poly(d, lf, (90, 175, 70, 255)); d.line([(ox + 30, oy - 226), (ox + 125, oy - 232)], fill=(60, 130, 50, 255), width=6)
    # 머리
    ell(d, ox, oy, HRX, HRY, c)
    if sp == 'cherry': ell(d, ox - 98, oy - 70, 34, 22, (255, 255, 255, 170), 0)
    if sp == 'puppy':
        for sx in (-1, 1):
            poly(d, [(ox + sx * 120, oy - 120), (ox + sx * 205, oy - 40), (ox + sx * 175, oy + 50), (ox + sx * 128, oy - 30)], (160, 108, 66, 255))
        ell(d, ox + 62, oy - 6, 44, 40, (236, 206, 170, 255), 0)
    if sp == 'cat':
        for k in (-1, 0, 1): d.line([(ox + k * 26, oy - 152), (ox + k * 22, oy - 112)], fill=(232, 150, 70, 255), width=12)
    if sp == 'bear': ell(d, ox, oy + 52, 74, 56, SP['bear']['belly'], 0)
    face(d, sp, ox, oy, expr, t)
    accessory(d, acc, ox, oy, t)

def eyes_pos(sp, ox, oy):
    if sp == 'frog': return ox - 92, ox + 92, oy - 118
    return ox - 66, ox + 66, oy - 8

def face(d, sp, ox, oy, expr, t):
    lx, rx, ey = eyes_pos(sp, ox, oy)
    my = oy + 48 if sp != 'bear' else oy + 66
    if sp == 'frog': my = oy + 30
    blink = (0.80 < t < 0.88)
    E = EXPR[expr]
    # 볼
    ch = SP[sp]['cheek']; cy_ = oy + 40
    if E.get('blush', 1):
        for sx in (-1, 1):
            ell(d, ox + sx * 112, cy_, 30, 18, ch, 0)
            if E.get('blush') == 2:
                for k in (-1, 0, 1): d.line([(ox + sx * 112 + k * 14 - 6, cy_ + 8), (ox + sx * 112 + k * 14 + 6, cy_ - 8)], fill=(230, 90, 110, 255), width=5)
    # 눈
    for side, x in ((-1, lx), (1, rx)):
        kind = E['eye'] if not (E['eye'] == 'dot' and blink) else 'line'
        if E['eye'] == 'wink' and side == 1: kind = 'arc'
        elif E['eye'] == 'wink': kind = 'dot'
        draw_eye(d, kind, x, ey, side, t)
    # 눈썹
    br = E.get('brow')
    if br == 'angry':
        for sx, x in ((-1, lx), (1, rx)): d.line([(x - sx * 34, ey - 52), (x + sx * 16, ey - 34)], fill=OL, width=12)
    elif br == 'sad':
        for sx, x in ((-1, lx), (1, rx)): d.line([(x - sx * 30, ey - 34), (x + sx * 16, ey - 52)], fill=OL, width=10)
    # 코
    if sp == 'bear': ell(d, ox, oy + 30, 22, 15, OL, 0)
    if sp == 'puppy': ell(d, ox, oy + 26, 18, 13, OL, 0)
    if sp == 'cat':
        ell(d, ox, oy + 26, 11, 8, (240, 120, 120, 255), 0)
        for sx in (-1, 1):
            for k in (-1, 1): d.line([(ox + sx * 130, oy + 30 + k * 8), (ox + sx * 192, oy + 22 + k * 22)], fill=OL, width=5)
    # 입
    mouth(d, E['mouth'], ox, my, t, sp)
    # 눈물
    if E.get('tears'):
        for x in (lx, rx):
            k = (t * 3) % 1
            d.line([(x, ey + 18), (x, ey + 70 + 40 * k)], fill=(120, 190, 255, 255), width=18)
            ell(d, x + (x - ox) * 0.15 * k, ey + 90 + 120 * k, 14, 18, (120, 190, 255, 255), 0)
    if E.get('drop'):
        dy = 10 * math.sin(TAU * t)
        poly(d, [(ox + 150, oy - 120 + dy), (ox + 130, oy - 70 + dy), (ox + 170, oy - 70 + dy)], (130, 200, 255, 255), 6)
        ell(d, ox + 150, oy - 66 + dy, 21, 21, (130, 200, 255, 255), 6)
    if E.get('pale'):
        for k in range(4): d.line([(ox - 90 + k * 60, oy - 150), (ox - 90 + k * 60, oy - 100)], fill=(120, 130, 220, 255), width=7)

def draw_eye(d, kind, x, y, side, t):
    if kind == 'dot':
        ell(d, x, y, 19, 23, OL, 0); ell(d, x - 6, y - 9, 8, 8, WHITE, 0); ell(d, x + 7, y + 8, 3, 3, WHITE, 0)
    elif kind == 'big':
        ell(d, x, y, 26, 31, OL, 0); ell(d, x - 8, y - 11, 11, 11, WHITE, 0); ell(d, x + 9, y + 10, 5, 5, WHITE, 0)
        if (t * 4) % 1 < 0.5: poly(d, star_pts(x + 12, y - 14, 9, 3, rot=-90 + 45 * t), WHITE, 0)
    elif kind == 'arc':
        d.arc([x - 26, y - 14, x + 26, y + 26], 200, 340, fill=OL, width=12)
    elif kind == 'line':
        d.line([(x - 22, y + 4), (x + 22, y + 4)], fill=OL, width=11)
    elif kind == 'down':
        d.arc([x - 24, y - 24, x + 24, y + 14], 20, 160, fill=OL, width=11)
    elif kind == 'xx':
        d.line([(x - 22, y - 18), (x + 18, y), (x - 22, y + 18)] if side < 0 else [(x + 22, y - 18), (x - 18, y), (x + 22, y + 18)], fill=OL, width=12, joint='curve')
    elif kind == 'heart':
        s = 2.0 + 0.35 * math.sin(TAU * t * 2)
        poly(d, heart_pts(x, y + 2, s), (240, 50, 85, 255), 0); ell(d, x - 12, y - 8, 6, 6, (255, 200, 210, 255), 0)
    elif kind == 'spiral':
        pts = []
        for i in range(40):
            a = i * 0.45 + TAU * t * side; r = 2 + i * 0.6
            pts.append((x + r * math.cos(a), y + r * math.sin(a)))
        d.line(pts, fill=OL, width=6, joint='curve')
    elif kind == 'shock':
        ell(d, x, y - 4, 30, 34, WHITE, 8); ell(d, x, y - 2, 8, 8, OL, 0)
    elif kind == 'sad':
        ell(d, x, y + 2, 19, 21, OL, 0); ell(d, x - 6, y - 6, 7, 7, WHITE, 0)
        ell(d, x + 2, y + 24, 14, 6, (140, 200, 255, 255), 0)
    elif kind == 'cool':
        if side < 0:
            d.rounded_rectangle([x - 46, y - 26, x + 44, y + 26], 18, fill=(30, 26, 30, 255))
            d.rounded_rectangle([x + 88, y - 26, x + 178, y + 26], 18, fill=(30, 26, 30, 255))
            d.line([(x + 40, y - 8), (x + 92, y - 8)], fill=(30, 26, 30, 255), width=10)
            k = (t * 2) % 1
            d.line([(x - 30 + 60 * k, y - 18), (x - 44 + 60 * k, y + 18)], fill=(255, 255, 255, 200), width=7)
    elif kind == 'angry':
        ell(d, x, y + 4, 18, 18, OL, 0); ell(d, x - 5, y - 2, 6, 6, WHITE, 0)

def mouth(d, kind, x, y, t, sp):
    beak = (255, 150, 40, 255)
    if sp == 'chick':
        if kind in ('open', 'cry', 'shout', 'o', 'tongue', 'eat'):
            d.chord([x - 32, y - 12, x + 32, y + 40], 0, 180, fill=(220, 60, 70, 255), outline=OL, width=7)
        poly(d, [(x - 26, y - 6), (x + 26, y - 6), (x, y + 16)], beak, 7)
        return
    if kind == 'w':
        d.arc([x - 34, y - 16, x, y + 16], 20, 170, fill=OL, width=9); d.arc([x, y - 16, x + 34, y + 16], 10, 160, fill=OL, width=9)
    elif kind == 'smile':
        d.arc([x - 30, y - 22, x + 30, y + 18], 25, 155, fill=OL, width=10)
    elif kind == 'open':
        d.chord([x - 38, y - 14, x + 38, y + 50], 0, 180, fill=(210, 50, 70, 255), outline=OL, width=9)
        d.chord([x - 20, y + 18, x + 20, y + 46], 180, 360, fill=(255, 130, 140, 255))
    elif kind == 'shout':
        k = 1 + 0.15 * math.sin(TAU * t * 2)
        ell(d, x, y + 22, 34 * k, 40 * k, (190, 40, 60, 255), 9); ell(d, x, y + 42, 18, 12, (255, 130, 140, 255), 0)
    elif kind == 'o':
        ell(d, x, y + 14, 18, 22, (190, 40, 60, 255), 8)
    elif kind == 'frown':
        d.arc([x - 28, y + 6, x + 28, y + 42], 205, 335, fill=OL, width=10)
    elif kind == 'wave':
        pts = [(x - 34 + i * 6, y + 14 + 7 * math.sin(i * 1.2 + TAU * t * 2)) for i in range(12)]
        d.line(pts, fill=OL, width=9, joint='curve')
    elif kind == 'grit':
        d.rounded_rectangle([x - 36, y, x + 36, y + 32], 10, fill=WHITE, outline=OL, width=8)
        for k in (-12, 12): d.line([(x + k, y + 4), (x + k, y + 28)], fill=OL, width=5)
        d.line([(x - 32, y + 16), (x + 32, y + 16)], fill=OL, width=5)
    elif kind == 'tongue':
        d.arc([x - 30, y - 18, x + 30, y + 18], 20, 160, fill=OL, width=10)
        d.chord([x - 4, y + 2, x + 34, y + 50 + 6 * math.sin(TAU * t * 2)], 0, 180, fill=(255, 110, 130, 255), outline=OL, width=7)
    elif kind == 'smirk':
        d.arc([x - 10, y - 18, x + 38, y + 16], 20, 140, fill=OL, width=10)
    elif kind == 'flat':
        d.line([(x - 22, y + 10), (x + 22, y + 10)], fill=OL, width=10)
    elif kind == 'cry':
        k = 1 + 0.12 * math.sin(TAU * t * 3)
        d.chord([x - 44 * k, y - 4, x + 44 * k, y + 56 * k], 180, 360, fill=(190, 40, 60, 255), outline=OL, width=9)
    elif kind == 'eat':
        k = abs(math.sin(TAU * t * 2))
        ell(d, x, y + 12, 26, 8 + 16 * k, (190, 40, 60, 255), 8)

EXPR = {
    'smile':  dict(eye='dot', mouth='w'),
    'happy':  dict(eye='arc', mouth='open'),
    'joy':    dict(eye='big', mouth='open', blush=2),
    'wink':   dict(eye='wink', mouth='open'),
    'love':   dict(eye='heart', mouth='open', blush=2),
    'shy':    dict(eye='arc', mouth='w', blush=2),
    'cry':    dict(eye='down', mouth='cry', tears=1, brow='sad'),
    'sad':    dict(eye='sad', mouth='wave', brow='sad'),
    'angry':  dict(eye='angry', mouth='grit', brow='angry', blush=0),
    'shock':  dict(eye='shock', mouth='shout', blush=0, pale=1),
    'sleepy': dict(eye='line', mouth='o'),
    'dizzy':  dict(eye='spiral', mouth='wave'),
    'proud':  dict(eye='arc', mouth='smirk'),
    'cool':   dict(eye='cool', mouth='smirk', blush=0),
    'tongue': dict(eye='xx', mouth='tongue'),
    'sorry':  dict(eye='xx', mouth='wave', brow='sad', drop=1),
    'laugh':  dict(eye='xx', mouth='open', blush=2),
    'eat':    dict(eye='arc', mouth='eat', blush=2),
    'calm':   dict(eye='down', mouth='smile'),
}

def accessory(d, acc, ox, oy, t):
    if not acc: return
    top = oy - HRY
    if acc == 'crown':
        pts = [(ox - 80, top + 20), (ox - 92, top - 70), (ox - 44, top - 25), (ox, top - 95), (ox + 44, top - 25), (ox + 92, top - 70), (ox + 80, top + 20)]
        poly(d, pts, (255, 205, 40, 255))
        for k, x in enumerate((-50, 0, 50)): ell(d, ox + x, top - 5, 10, 10, [(230, 40, 70, 255), (60, 140, 240, 255), (60, 190, 100, 255)][k], 0)
    elif acc == 'party':
        poly(d, [(ox - 40, top + 22), (ox + 70, top + 10), (ox + 30, top - 140)], (90, 170, 255, 255))
        for k in range(3): d.line([(ox - 22 + k * 30, top + 8 - k * 40), (ox + 40 + k * 8, top + 0 - k * 44)], fill=(255, 230, 80, 255), width=10)
        ell(d, ox + 30, top - 145, 18, 18, (255, 90, 120, 255), 6)
    elif acc == 'band':
        d.chord([ox - HRX + 6, oy - 120, ox + HRX - 6, oy - 40], 180, 360, fill=None)
        d.line([(ox - 160, oy - 82), (ox + 160, oy - 82)], fill=OL, width=44); d.line([(ox - 156, oy - 82), (ox + 156, oy - 82)], fill=(230, 40, 60, 255), width=26)
        ell(d, ox, oy - 82, 16, 16, WHITE, 0)
        d.line([(ox + 150, oy - 82), (ox + 210, oy - 110 + 12 * math.sin(TAU * t * 2))], fill=(230, 40, 60, 255), width=18)
    elif acc == 'grad':
        poly(d, [(ox - 150, top - 20), (ox, top - 75), (ox + 150, top - 20), (ox, top + 30)], (40, 40, 50, 255))
        d.line([(ox + 10, top - 22), (ox + 120, top + 40 + 8 * math.sin(TAU * t))], fill=(255, 205, 40, 255), width=8)
    elif acc == 'night':
        poly(d, [(ox - 170, top + 50), (ox + 150, top + 40), (ox + 200, top + 120 + 10 * math.sin(TAU * t))], (120, 150, 240, 255))
        ell(d, ox + 200, top + 128 + 10 * math.sin(TAU * t), 22, 22, WHITE, 6)
    elif acc == 'ribbon':
        for sx in (-1, 1): poly(d, [(ox + 100, top + 22), (ox + 100 + sx * 55, top - 18), (ox + 100 + sx * 55, top + 62)], (255, 110, 160, 255), 7)
        ell(d, ox + 100, top + 22, 18, 18, (255, 110, 160, 255), 7)
    elif acc == 'flower':
        for k in range(5):
            a = TAU * k / 5
            ell(d, ox + 110 + 26 * math.cos(a), top + 30 + 26 * math.sin(a), 20, 20, (255, 160, 190, 255), 5)
        ell(d, ox + 110, top + 30, 15, 15, (255, 215, 60, 255), 5)

# ---------- 소품 ----------
def prop(d, name, x, y, t, ang=0):
    if not name: return
    if name == 'beer':
        d.rounded_rectangle([x - 34, y - 60, x + 34, y + 40], 10, fill=(255, 190, 40, 255), outline=OL, width=8)
        d.arc([x + 18, y - 40, x + 66, y + 20], 270, 90, fill=OL, width=12)
        for k in (-22, 0, 22): ell(d, x + k, y - 64, 22, 18, WHITE, 7)
        for k in range(2): ell(d, x - 12 + k * 20, y - 10 + ((t * 2 + k * 0.5) % 1) * -40, 5, 5, (255, 240, 180, 255), 0)
    elif name == 'coffee':
        d.polygon([(x - 34, y - 42), (x + 34, y - 42), (x + 26, y + 44), (x - 26, y + 44)], fill=WHITE)
        d.line([(x - 34, y - 42), (x + 34, y - 42), (x + 26, y + 44), (x - 26, y + 44), (x - 34, y - 42)], fill=OL, width=8)
        d.rectangle([x - 30, y - 10, x + 30, y + 14], fill=(170, 110, 70, 255))
        d.rounded_rectangle([x - 40, y - 62, x + 40, y - 40], 8, fill=(170, 110, 70, 255), outline=OL, width=7)
    elif name == 'phone':
        d.rounded_rectangle([x - 26, y - 48, x + 26, y + 48], 10, fill=(70, 80, 110, 255), outline=OL, width=8)
        d.rectangle([x - 16, y - 34, x + 16, y + 30], fill=(150, 210, 255, 255))
    elif name == 'bouquet':
        poly(d, [(x - 40, y - 10), (x + 40, y - 10), (x, y + 70)], (255, 240, 200, 255), 7)
        for k, (fx, fy) in enumerate([(-34, -40), (0, -60), (34, -40), (-16, -14), (18, -16)]):
            col = [(255, 110, 150, 255), (255, 200, 60, 255), (255, 140, 180, 255), (240, 80, 110, 255), (255, 170, 80, 255)][k]
            ell(d, x + fx, y + fy, 24, 24, col, 6); ell(d, x + fx, y + fy, 8, 8, (255, 240, 150, 255), 0)
    elif name == 'cake':
        d.rounded_rectangle([x - 60, y - 30, x + 60, y + 40], 10, fill=(255, 240, 225, 255), outline=OL, width=8)
        d.rectangle([x - 54, y - 6, x + 54, y + 8], fill=(255, 140, 170, 255))
        d.rectangle([x - 6, y - 80, x + 6, y - 32], fill=(120, 190, 255, 255), outline=OL, width=4)
        fl = 6 * math.sin(TAU * t * 4)
        poly(d, [(x, y - 112 + fl), (x - 13, y - 84), (x + 13, y - 84)], (255, 170, 40, 255), 0)
        ell(d, x, y - 88, 12, 12, (255, 120, 30, 255), 0)
    elif name == 'gift':
        d.rectangle([x - 52, y - 40, x + 52, y + 46], fill=(255, 90, 120, 255), outline=OL, width=8)
        d.rectangle([x - 10, y - 40, x + 10, y + 46], fill=(255, 220, 60, 255))
        for sx in (-1, 1): ell(d, x + sx * 26, y - 56, 26, 16, (255, 220, 60, 255), 7)
    elif name == 'bowl':
        d.chord([x - 64, y - 46, x + 64, y + 46], 0, 180, fill=(240, 240, 250, 255), outline=OL, width=8)
        ell(d, x, y, 60, 14, (255, 255, 255, 255), 6)
        for k in (-28, 0, 28): ell(d, x + k, y - 12, 22, 18, WHITE, 5)
        for k in range(3):
            yy = y - 40 - ((t + k / 3) % 1) * 60
            d.arc([x - 40 + k * 30, yy - 20, x - 20 + k * 30, yy + 20], 90, 270, fill=(200, 200, 210, 255), width=5)
    elif name == 'chop':
        d.line([(x - 10, y + 30), (x + 60, y - 60)], fill=(150, 100, 60, 255), width=10)
        d.line([(x + 6, y + 34), (x + 74, y - 52)], fill=(150, 100, 60, 255), width=10)
    elif name == 'umbrella':
        d.line([(x, y - 200), (x, y + 30)], fill=OL, width=10)
        d.chord([x - 170, y - 300, x + 170, y - 100], 180, 360, fill=(255, 120, 150, 255), outline=OL, width=9)
        for k in (-85, 0, 85): d.line([(x, y - 300), (x + k, y - 200)], fill=OL, width=5)
    elif name == 'bigheart':
        s = 5.4 + 0.5 * math.sin(TAU * t * 2)
        poly(d, heart_pts(x, y, s), (240, 50, 85, 255)); ell(d, x - 30, y - 22, 14, 10, (255, 200, 210, 255), 0)
    elif name == 'coin':
        ell(d, x, y, 48, 48, (255, 205, 40, 255)); ell(d, x, y, 32, 32, (255, 225, 110, 255), 0)
        f = ImageFont.truetype(FONT, 48); d.text((x, y), '₩', font=f, fill=(190, 130, 20, 255), anchor='mm')
    elif name == 'scarf':
        d.rounded_rectangle([x - 130, y - 26, x + 130, y + 26], 26, fill=(230, 60, 70, 255), outline=OL, width=8)
        d.rounded_rectangle([x + 40, y, x + 90, y + 100], 16, fill=(230, 60, 70, 255), outline=OL, width=8)
        for k in (-80, -20, 40, 100): d.line([(x + k, y - 22), (x + k, y + 22)], fill=(255, 255, 255, 120), width=6)
    elif name == 'book':
        d.rounded_rectangle([x - 60, y - 44, x + 60, y + 44], 8, fill=(100, 150, 240, 255), outline=OL, width=8)
        d.line([(x, y - 44), (x, y + 44)], fill=OL, width=6)

# ---------- 효과 ----------
def effect(d, name, t, ox, oy):
    """(ox,oy)=머리 가운데 근처"""
    if not name: return
    for nm in name.split('+'): _effect(d, nm, t, ox, oy)

def _effect(d, name, t, ox, oy):
    if name == 'hearts':
        for k in range(4):
            p = (t + k / 4) % 1
            x = ox + [-230, 220, -170, 250][k] + 18 * math.sin(TAU * (p + k * .3)); y = oy + 160 - p * 330
            if p < 0.92: poly(d, heart_pts(x, y, 1.9 + 1.0 * math.sin(math.pi * p)), (245, 70, 105, 255), 6)
    elif name == 'sparkle':
        for k, (x, y) in enumerate([(-235, -120), (230, -170), (250, 90), (-250, 120), (0, -270)]):
            s = abs(math.sin(math.pi * ((t * 2 + k * 0.37) % 1)))
            if s > 0.1: poly(d, star_pts(ox + x, oy + y, 34 * s, 10 * s, n=4), (255, 210, 50, 255), 5)
    elif name == 'confetti':
        cols = [(255, 90, 120, 255), (90, 170, 255, 255), (255, 210, 50, 255), (110, 210, 120, 255), (190, 120, 255, 255)]
        for k in range(18):
            p = (t + k * 0.137) % 1
            x = (k * 97) % (C - 80) + 40 + 20 * math.sin(TAU * (p * 2 + k)); y = -40 + p * 620
            a = TAU * (p * 3 + k * 0.2)
            dx, dy = 16 * math.cos(a), 9 * math.sin(a)
            d.polygon([(x - dx, y - dy), (x + dy, y - dx * .3), (x + dx, y + dy), (x - dy, y + dx * .3)], fill=cols[k % 5])
    elif name == 'zzz':
        f = ImageFont.truetype(FONT, 70)
        for k in range(3):
            p = (t + k / 3) % 1
            d.text((ox + 170 + p * 90, oy - 120 - p * 170), 'Z', font=f, fill=(110, 130, 230, 255), anchor='mm', stroke_width=8, stroke_fill=WHITE)
    elif name == 'sweat':
        for k, sx in enumerate((1, -1)):
            p = (t * 1.5 + k * 0.5) % 1
            x, y = ox + sx * (175 + 30 * p), oy - 100 + 90 * p
            poly(d, [(x, y - 34), (x - 18, y), (x + 18, y)], (130, 200, 255, 255), 6); ell(d, x, y + 4, 19, 19, (130, 200, 255, 255), 6)
    elif name == 'notes':
        f = ImageFont.truetype(FONT, 80)
        for k in range(3):
            p = (t + k / 3) % 1
            d.text((ox + [-240, 230, 260][k] + 20 * math.sin(TAU * p), oy + 60 - p * 260), ['♪', '♫', '♪'][k], font=f, fill=[(255, 120, 150, 255), (90, 170, 255, 255), (255, 170, 40, 255)][k], anchor='mm', stroke_width=6, stroke_fill=WHITE)
    elif name == 'steam':
        for sx in (-1, 1):
            p = (t * 2) % 1
            x, y = ox + sx * 150, oy - 170 - p * 60
            r = 22 + 26 * p
            ell(d, x, y, r, r * 0.8, (255, 255, 255, 255), 7); ell(d, x + sx * 30, y + 26, r * 0.6, r * 0.5, WHITE, 7)
        poly(d, star_pts(ox + 150, oy - 120, 40, 16, n=4, rot=45), (240, 60, 70, 255), 0)
    elif name == 'fire':
        for sx in (-1, 1):
            fl = 14 * math.sin(TAU * t * 3 + sx)
            x, y = ox + sx * 255, oy + 180
            poly(d, [(x - 52, y + 40), (x - 42, y - 50), (x - 16, y - 18), (x, y - 120 + fl), (x + 18, y - 22), (x + 44, y - 60), (x + 52, y + 40)], (255, 110, 30, 255), 7)
            poly(d, [(x - 26, y + 34), (x - 14, y - 10), (x, y - 56 + fl), (x + 16, y - 8), (x + 26, y + 34)], (255, 220, 70, 255), 0)
    elif name == 'rain':
        for k in range(14):
            p = (t * 2 + k * 0.173) % 1
            x = (k * 61) % (C - 60) + 30; y = -40 + p * 640
            d.line([(x, y), (x - 10, y + 40)], fill=(100, 170, 255, 255), width=9)
    elif name == 'snow':
        for k in range(14):
            p = (t + k * 0.173) % 1
            x = (k * 61) % (C - 60) + 30 + 20 * math.sin(TAU * (p + k * .2)); y = -30 + p * 620
            ell(d, x, y, 14, 14, WHITE, 5)
    elif name == 'speed':
        for k in range(5):
            p = (t * 3 + k * 0.23) % 1
            y = oy + 60 + k * 70; x0 = 40 + 60 * p
            d.line([(x0, y), (x0 + 120, y)], fill=(170, 160, 150, 255), width=10)
    elif name == 'dust':
        for k in range(3):
            p = (t * 2 + k / 3) % 1
            x, y = CX - 150 - p * 90, BASE - 10 - p * 30
            r = 14 + 22 * p
            ell(d, x, y, r, r, (235, 230, 225, 255), 6)
    elif name == 'flowers':
        for k in range(6):
            p = (t + k / 6) % 1
            x = (k * 131) % (C - 100) + 50 + 30 * math.sin(TAU * p); y = -30 + p * 600
            for j in range(5):
                a = TAU * j / 5 + p * 6
                ell(d, x + 12 * math.cos(a), y + 12 * math.sin(a), 11, 11, (255, 175, 200, 255), 0)
            ell(d, x, y, 7, 7, (255, 220, 80, 255), 0)
    elif name == 'question':
        f = ImageFont.truetype(FONT, 150)
        k = 1 + 0.15 * math.sin(TAU * t * 2)
        d.text((ox + 230, oy - 150 - 10 * math.sin(TAU * t)), '?', font=ImageFont.truetype(FONT, int(140 * k)), fill=(110, 120, 240, 255), anchor='mm', stroke_width=12, stroke_fill=OL)
    elif name == 'bang':
        k = 1 + 0.2 * abs(math.sin(TAU * t * 2))
        d.text((ox + 230, oy - 160), '!', font=ImageFont.truetype(FONT, int(160 * k)), fill=(255, 80, 70, 255), anchor='mm', stroke_width=12, stroke_fill=OL)
        for a in (-60, -20, 20):
            r = math.radians(a - 90)
            d.line([(ox - 230 + 40 * math.cos(r), oy - 160 + 40 * math.sin(r)), (ox - 230 + 90 * math.cos(r), oy - 160 + 90 * math.sin(r))], fill=OL, width=12)
    elif name == 'stars':
        for k in range(3):
            a = TAU * (t + k / 3)
            poly(d, star_pts(ox + 170 * math.cos(a), oy - 200 + 40 * math.sin(a), 30, 13), (255, 210, 50, 255), 6)
    elif name == 'sun':
        x, y = ox + 230, oy - 200
        for k in range(8):
            a = TAU * k / 8 + t * TAU / 8
            d.line([(x + 62 * math.cos(a), y + 62 * math.sin(a)), (x + 92 * math.cos(a), y + 92 * math.sin(a))], fill=(255, 170, 30, 255), width=12)
        ell(d, x, y, 48, 48, (255, 205, 50, 255), 7)
    elif name == 'coins':
        for k in range(7):
            p = (t + k / 7) % 1
            x = (k * 113) % (C - 120) + 60; y = -40 + p * 600
            w = 30 * abs(math.cos(TAU * (p * 2 + k * .3)))
            d.ellipse([x - w - 2, y - 30, x + w + 2, y + 30], fill=(255, 205, 40, 255), outline=OL, width=6)
    elif name == 'ring':
        for k in range(3):
            p = (t * 2 + k / 3) % 1
            r = 40 + p * 60
            d.arc([ox + 230 - r, oy - 40 - r, ox + 230 + r, oy - 40 + r], -50, 50, fill=(255, 120, 60, 255), width=10)
    elif name == 'clap':
        k = (t * 2) % 1
        if k < 0.35:
            for a in range(0, 360, 45):
                r = math.radians(a)
                d.line([(CX + 50 * math.cos(r), BASE - 260 + 50 * math.sin(r)), (CX + (80 + 60 * k) * math.cos(r), BASE - 260 + (80 + 60 * k) * math.sin(r))], fill=(255, 180, 40, 255), width=10)
    elif name == 'gloom':
        x, y = ox, oy - 250 + 6 * math.sin(TAU * t)
        for k, (dx, r) in enumerate([(-80, 52), (-20, 66), (50, 58), (100, 44)]): ell(d, x + dx, y, r, r * .8, (150, 150, 165, 255), 7)
        for k in range(4):
            p = (t * 2 + k / 4) % 1
            d.line([(x - 70 + k * 50, y + 50 + p * 80), (x - 76 + k * 50, y + 74 + p * 80)], fill=(100, 160, 240, 255), width=8)
    elif name == 'shine':
        for k in range(10):
            a = TAU * k / 10 + TAU * t / 10
            r1, r2 = 220, 280 + 20 * math.sin(TAU * t * 2 + k)
            d.line([(ox + r1 * math.cos(a), oy + 60 + r1 * math.sin(a)), (ox + r2 * math.cos(a), oy + 60 + r2 * math.sin(a))], fill=(255, 210, 60, 255), width=12)
    elif name == 'boom':
        k = (t * 2) % 1
        poly(d, star_pts(ox - 230, oy - 150, 60 + 20 * k, 30, n=8), (255, 230, 80, 255), 7)

# ---------- 동작 ----------
def pose(name, t):
    s, c = math.sin(TAU * t), math.cos(TAU * t)
    P = dict(dx=0, dy=0, rot=0, sx=1, sy=1, hrot=0, hdy=0, L=(-128, -80), R=(128, -80), hL='fist', hR='fist',
             fL=(0, 0), fR=(0, 0), pR=None, pL=None, pC=None, pang=0)
    if name == 'wave':
        a = math.radians(-58 + 26 * math.sin(TAU * t * 2))
        P.update(R=(SH + 130 * math.cos(a), SHY + 130 * math.sin(a)), rot=3 * s, dy=-8 * abs(s), hrot=-6 * s, hR='open')
    elif name == 'wave2':
        for side, k in (('R', 1), ('L', -1)):
            a = math.radians(-60 + 24 * math.sin(TAU * t * 2 + (0 if k > 0 else math.pi)))
            P[side] = (k * (SH + 130 * math.cos(a)), SHY + 130 * math.sin(a))
        P.update(dy=-14 * abs(math.sin(TAU * t * 2)), hL='open', hR='open')
    elif name == 'bow':
        k = ease((0.5 - 0.5 * c) * 1.2)
        P.update(hdy=55 * k, sy=1 - 0.08 * k, L=(-36, -112 + 10 * k), R=(36, -112 + 10 * k), hrot=0)
    elif name == 'nod':
        k = max(0, math.sin(TAU * t * 2))
        P.update(hdy=24 * k, hrot=4 * k, sy=1 - 0.03 * k, L=(-120, -110), R=(120, -110))
    elif name == 'jump':
        h = math.sin(math.pi * t)
        up = ease(h * 1.4)
        P.update(dy=-110 * h, sy=1 + 0.08 * h - (0.14 if h < 0.12 else 0), sx=1 - 0.04 * h + (0.1 if h < 0.12 else 0),
                 L=(lerp(-125, -150, up), lerp(-80, -330, up)), R=(lerp(125, 150, up), lerp(-80, -330, up)), fL=(-10 * h, -14 * h), fR=(10 * h, -14 * h), hL='open', hR='open')
    elif name == 'run':
        P.update(rot=-6, dy=-16 * abs(math.sin(TAU * t * 2)), R=(120, -110 + 50 * math.sin(TAU * t * 2)), L=(-120, -110 - 50 * math.sin(TAU * t * 2)),
                 fL=(0, -32 * max(0, math.sin(TAU * t * 2))), fR=(0, -32 * max(0, -math.sin(TAU * t * 2))), hrot=-4)
    elif name == 'clap':
        k = 0.5 + 0.5 * math.cos(TAU * t * 2)
        P.update(L=(-(10 + 70 * k), -170 - 20 * k), R=((10 + 70 * k), -170 - 20 * k), dy=-10 * abs(math.sin(TAU * t * 2)), hL='open', hR='open')
    elif name == 'thumbs':
        k = abs(math.sin(TAU * t))
        P.update(R=(150, -200 - 30 * k), hR='thumb', L=(-112, -60), rot=4 * s, hrot=-5 * s)
    elif name == 'heart':
        P.update(L=(-80, -125), R=(80, -125), pC=('bigheart', 0, -150), dy=-8 * abs(s), rot=3 * s, hL='open', hR='open')
    elif name == 'nox':
        P.update(L=(70, -175), R=(-70, -175), hrot=12 * math.sin(TAU * t * 2), rot=-3 * math.sin(TAU * t * 2))
    elif name == 'rub':
        P.update(L=(-70 + 10 * math.cos(TAU * t * 3), -312 + 10 * math.sin(TAU * t * 3)), R=(70 - 10 * math.cos(TAU * t * 3), -312 + 10 * math.sin(TAU * t * 3)),
                 dx=4 * math.sin(TAU * t * 4), sy=1 + 0.02 * math.sin(TAU * t * 4))
    elif name == 'stomp':
        P.update(L=(-125, -70), R=(125, -70), dx=7 * math.sin(TAU * t * 4), fL=(0, -40 * max(0, math.sin(TAU * t * 2))), fR=(0, -40 * max(0, -math.sin(TAU * t * 2))),
                 sy=1 - 0.04 * abs(math.sin(TAU * t * 2)))
    elif name == 'hold':
        P.update(L=(-60, -125), R=(60, -125), dy=-10 * abs(s), rot=3 * s, pC=None)
    elif name == 'drink':
        k = ease(max(0, math.sin(TAU * t)) * 1.3)
        P.update(R=(lerp(130, 70, k), lerp(-130, -255, k)), hrot=-10 * k, hdy=-6 * k, L=(-115, -85))
    elif name == 'toast':
        P.update(R=(150, -265 + 12 * s), pang=15 * math.sin(TAU * t * 2), rot=4 * s, dy=-10 * abs(s), L=(-115, -85))
    elif name == 'sleep':
        P.update(rot=-5 + 2 * s, hrot=-12, sy=1 + 0.03 * s, L=(-105, -275), R=(-60, -262))
    elif name == 'shiver':
        P.update(dx=6 * math.sin(TAU * t * 6), L=(55, -135), R=(-55, -150), sy=0.97)
    elif name == 'roll':
        P.update(rot=15 * s, hrot=8 * s, L=(-40, -95), R=(60 + 20 * abs(math.sin(TAU * t * 3)), -110), dy=-6 * abs(s))
    elif name == 'beckon':
        k = 0.5 + 0.5 * math.sin(TAU * t * 2)
        P.update(R=(170 - 50 * k, -190 - 20 * k), hR='open', rot=-4 + 3 * k, L=(-115, -80))
    elif name == 'phone':
        P.update(R=(135, -320), pR=('phone', 0, 0), hrot=8, rot=2 * s, L=(-110, -90), dy=-6 * abs(s))
    elif name == 'dance':
        P.update(dx=22 * s, rot=8 * s, hrot=-6 * s, R=(130, -230 + 80 * s), L=(-130, -230 - 80 * s),
                 fL=(0, -24 * max(0, s)), fR=(0, -24 * max(0, -s)), hL='open', hR='open')
    elif name == 'shy':
        P.update(L=(-112, -282), R=(112, -282), rot=6 * s, hrot=4 * s, hL='open', hR='open')
    elif name == 'slump':
        P.update(sy=0.95, hdy=18, rot=3 * s, L=(-105, -45), R=(105, -45), hrot=-6)
    elif name == 'dizzy':
        P.update(rot=13 * s, hrot=-10 * s, L=(-150 + 20 * c, -200 + 30 * s), R=(150 - 20 * c, -200 - 30 * s), hL='open', hR='open')
    elif name == 'fight':
        a = max(0, math.sin(TAU * t * 2)); b = max(0, -math.sin(TAU * t * 2))
        P.update(R=(lerp(110, 135, a), lerp(-140, -330, a)), L=(lerp(-110, -135, b), lerp(-140, -330, b)), dy=-12 * abs(math.sin(TAU * t * 2)))
    elif name == 'bounce':
        P.update(dy=-26 * abs(math.sin(TAU * t)), sy=1 + 0.04 * math.cos(TAU * t * 2), L=(-140, -170), R=(140, -170), hL='open', hR='open')
    elif name == 'look':
        P.update(hrot=13 * s, R=(70, -372), hR='open', L=(-115, -85), rot=-3 * s)
    elif name == 'eat':
        k = ease(max(0, math.sin(TAU * t * 2)) * 1.2)
        P.update(L=(-70, -110), pL=('bowl', 20, -10), R=(lerp(80, 40, k), lerp(-140, -235, k)), pR=('chop', 0, 0), hdy=-4 * k)
    elif name == 'belly':
        P.update(L=(-50 + 20 * c, -100 + 15 * s), R=(50 + 20 * c, -100 - 15 * s), sx=1.06, sy=0.96, rot=2 * s, hL='open', hR='open')
    elif name == 'umbrella':
        P.update(R=(55, -175), pR=('umbrella', 0, 0), L=(-110, -80), rot=2 * s, dy=-4 * abs(s))
    elif name == 'present':
        k = abs(math.sin(TAU * t))
        P.update(L=(-62, -150 - 20 * k), R=(62, -150 - 20 * k), dy=-8 * k)
    elif name == 'banzai':
        h = abs(math.sin(TAU * t))
        P.update(L=(-150, -330 + 30 * h), R=(150, -330 + 30 * h), dy=-60 * h, hL='open', hR='open', sy=1 + 0.05 * h)
    elif name == 'point':
        P.update(R=(185, -210), hR='point', L=(-112, -80), rot=-5 + 3 * s, dy=-8 * abs(s))
    return P

def hand(d, kind, x, y, col, side):
    if kind == 'thumb':
        ell(d, x, y, 34, 30, col)
        cap(d, (x - 6 * side, y - 22), (x - 2 * side, y - 66), 26, col)
        ell(d, x, y, 34 - OW, 30 - OW, col, 0)
    elif kind == 'point':
        cap(d, (x, y), (x + 62, y - 6), 22, col)
        ell(d, x, y, 32, 30, col)
    elif kind == 'open':
        ell(d, x, y, 34, 34, col)
    else:
        ell(d, x, y, 30, 30, col)

def draw_char(sp, expr, P, t, acc, held):
    """캐릭터 한 장(투명 RGBA, 아직 기울이기·눌림 전)"""
    im = Image.new('RGBA', (C, C), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    col = SP[sp]['c']; bx, by = CX + P['dx'], BASE + P['dy']
    X = lambda p: (bx + p[0], by + p[1])
    # 발
    for sx, f in ((-1, P['fL']), (1, P['fR'])):
        ell(d, bx + sx * 58 + f[0], by - 22 + f[1], 52, 30, col)
    # 팔(윗부분 테두리) → 몸 → 팔 윗부분 칠
    arms = []
    for side, key in ((-1, 'L'), (1, 'R')):
        sh = X((side * SH, SHY)); hd = X(P[key])
        mid = (lerp(sh[0], hd[0], .5), lerp(sh[1], hd[1], .5))
        arms.append((side, key, sh, mid, hd))
        cap(d, sh, mid, 46, col)
    ell(d, bx, by + BODY_Y, BRX, BRY, SP[sp]['b'])
    if SP[sp]['belly']: ell(d, bx, by + BODY_Y + 18, 74, 66, SP[sp]['belly'], 0)
    if sp == 'chick': pass
    for side, key, sh, mid, hd in arms: cap(d, sh, mid, 46, col, ol=False)
    # 머리 (따로 그려 돌림)
    hl = Image.new('RGBA', (C, C), (0, 0, 0, 0)); hdw = ImageDraw.Draw(hl)
    hx, hy = bx, by + HEAD_Y + P['hdy']
    head(hdw, sp, hx, hy, expr, t, acc)
    if held == 'scarf': prop(hdw, 'scarf', hx, hy + HRY - 10, t)
    if P['hrot']: hl = hl.rotate(P['hrot'], resample=Image.BICUBIC, center=(hx, hy + HRY))
    im.alpha_composite(hl); d = ImageDraw.Draw(im)
    # 가운데 소품(큰 하트·선물·케이크 등 두 손으로 드는 것)
    pc = P['pC']
    center_prop = pc[0] if pc else (held if P.get('two') or (held in ('gift', 'cake', 'bouquet', 'bowl', 'book', 'coin') and P['pR'] is None and P['pL'] is None) else None)
    # 팔 아랫부분
    for side, key, sh, mid, hd in arms: cap(d, mid, hd, 46, col)
    if center_prop:
        if pc: prop(d, center_prop, bx + pc[1], by + pc[2], t)
        else:
            mx = (bx + P['L'][0] + bx + P['R'][0]) / 2; my = (by + P['L'][1] + by + P['R'][1]) / 2
            prop(d, center_prop, mx, my - 20, t)
    for key in ('pR', 'pL'):
        pr = P[key]
        if pr:
            hp = X(P[key[1]]); prop(d, pr[0], hp[0] + pr[1], hp[1] + pr[2], t)
    if held in ('beer', 'coffee', 'phone', 'bouquet') and not P['pR'] and not center_prop:
        hp = X(P['R'])
        lay = Image.new('RGBA', (C, C), (0, 0, 0, 0)); prop(ImageDraw.Draw(lay), held, hp[0] + 4, hp[1] - 30, t)
        if P['pang']: lay = lay.rotate(-P['pang'], resample=Image.BICUBIC, center=hp)
        im.alpha_composite(lay); d = ImageDraw.Draw(im)
    for side, key, sh, mid, hd in arms: hand(d, P['h' + key], hd[0], hd[1], col, side)
    return im, (bx, by), (hx, hy)

def transform(im, P, base):
    """기울이기·눌림 — 발 기준"""
    bx, by = base
    a = math.radians(P['rot']); ca, sa = math.cos(a), math.sin(a)
    sx, sy = P['sx'] * ZOOM, P['sy'] * ZOOM
    # 정변환 p' = B + R S (p - B)  (y 아래 방향, 화면에서 시계 반대 = rot +)
    # 역변환 p = B + S^-1 R^-1 (p' - B)
    m00, m01 = ca / sx, -sa / sx
    m10, m11 = sa / sy, ca / sy
    cst = bx - m00 * bx - m01 * by
    cst2 = by - m10 * bx - m11 * by
    return im.transform(im.size, Image.AFFINE, (m00, m01, cst, m10, m11, cst2), resample=Image.BICUBIC)

_fontcache = {}
def text_layer(txt, col):
    txt = txt.replace('…', '..')
    key = (txt, col)
    if key in _fontcache: return _fontcache[key]
    im = Image.new('RGBA', (C, C), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    size = 165
    while True:
        f = ImageFont.truetype(FONT, size)
        w = d.textlength(txt, font=f)
        if w <= C - 90 or size < 70: break
        size -= 5
    y = C - 112
    d.text((CX, y), txt, font=f, fill=OL, anchor='mm', stroke_width=30, stroke_fill=OL)
    d.text((CX, y), txt, font=f, fill=WHITE, anchor='mm', stroke_width=20, stroke_fill=WHITE)
    d.text((CX, y), txt, font=f, fill=col + (255,), anchor='mm')
    _fontcache[key] = im
    return im

def frame(row, t):
    sp, expr, pz, fx, held, acc, txt, col = row
    P = pose(pz, t)
    if held == 'umbrella' and not P['pR']: P['pR'] = ('umbrella', 0, 0)
    ch, base, hc = draw_char(sp, expr, P, t, acc, held)
    ch = transform(ch, P, base)
    hc = (base[0] + ZOOM * (hc[0] - base[0]), base[1] + ZOOM * (hc[1] - base[1]))
    fl = Image.new('RGBA', (C, C), (0, 0, 0, 0))
    effect(ImageDraw.Draw(fl), fx, t, hc[0], hc[1])
    # 뒤에 깔리는 효과(빛·꽃가루·비 등)는 캐릭터 뒤, 나머지는 앞
    back = {'shine', 'confetti', 'rain', 'snow', 'flowers', 'coins', 'speed', 'dust'}
    lay = Image.new('RGBA', (C, C), (0, 0, 0, 0))
    if fx and any(n in back for n in fx.split('+')):
        bl = Image.new('RGBA', (C, C), (0, 0, 0, 0)); fr = Image.new('RGBA', (C, C), (0, 0, 0, 0))
        for n in fx.split('+'): effect(ImageDraw.Draw(bl if n in back else fr), n, t, hc[0], hc[1])
        lay.alpha_composite(bl); lay.alpha_composite(ch); lay.alpha_composite(fr)
    else:
        lay.alpha_composite(ch); lay.alpha_composite(fl)
    small = lay.resize((FIN, FIN), Image.LANCZOS)
    # 흰 스티커 테두리
    a = small.getchannel('A').point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(7))
    st = Image.new('RGBA', (FIN, FIN), (255, 255, 255, 0)); st.putalpha(a)
    st.alpha_composite(small)
    st.alpha_composite(text_layer(txt, col).resize((FIN, FIN), Image.LANCZOS))
    return st

def save_gif(frames, fn):
    out = []
    for f in frames:
        arr = np.array(f)
        mask = arr[:, :, 3] < 110
        rgb = Image.fromarray(arr[:, :, :3])
        q = rgb.quantize(colors=PAL, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        qa = np.array(q); qa[mask] = 255
        pal = q.getpalette()[:255 * 3] + [0, 0, 0]
        p = Image.fromarray(qa.astype(np.uint8), 'P'); p.putpalette(pal)
        p.info['transparency'] = 255
        out.append(p)
    out[0].save(fn, save_all=True, append_images=out[1:], duration=DUR, loop=0, transparency=255, disposal=2, optimize=True)

def make(i, row):
    frames = [frame(row, k / NF) for k in range(NF)]
    save_gif(frames, os.path.join(OUT, 'e%03d.gif' % i))
    return frames[NF // 4]

# ---------- 100개 [캐릭터, 표정, 동작, 효과, 소품, 머리장식, 글씨, 글씨색, 주제] ----------
RED, PINK, BLUE, GRN, ORG, PUR, BRN, YEL = (232, 44, 72), (250, 96, 150), (52, 118, 230), (44, 160, 82), (255, 128, 28), (148, 88, 222), (150, 92, 52), (240, 170, 0)
L = [
 # 💛 인사 12
 ('cherry', 'joy', 'wave2', 'sparkle', None, None, '싸바 싸바!', RED, '💛 인사'),
 ('cherry', 'smile', 'look', 'question', None, None, '싸바?', RED, '💛 인사'),
 ('bear', 'happy', 'wave', None, None, None, '안녕~', BRN, '💛 인사'),
 ('chick', 'joy', 'banzai', 'sun', None, None, '좋은 아침!', ORG, '💛 인사'),
 ('bunny', 'sleepy', 'sleep', 'zzz', None, 'night', '굿나잇', BLUE, '💛 인사'),
 ('cat', 'smile', 'look', None, None, None, '뭐 해?', ORG, '💛 인사'),
 ('puppy', 'joy', 'jump', 'hearts', None, None, '반가워!', PINK, '💛 인사'),
 ('frog', 'happy', 'dance', 'flowers', None, 'flower', '좋은 하루', GRN, '💛 인사'),
 ('bear', 'smile', 'phone', 'ring', 'phone', None, '통화 돼?', BRN, '💛 인사'),
 ('bunny', 'smile', 'wave', 'hearts', None, 'ribbon', '잘 지내지?', PINK, '💛 인사'),
 ('cat', 'wink', 'jump', 'boom', None, None, '짠! 나야', PUR, '💛 인사'),
 ('frog', 'joy', 'wave2', 'notes', None, None, '개굴~ 안녕', GRN, '💛 인사'),
 # 😊 대답 12
 ('bear', 'happy', 'nod', None, None, None, '응응!', BRN, '😊 대답'),
 ('chick', 'proud', 'thumbs', 'sparkle', None, None, '오케이', GRN, '😊 대답'),
 ('bunny', 'calm', 'bow', None, None, None, '알겠어~', BLUE, '😊 대답'),
 ('cat', 'shock', 'shiver', 'bang', None, None, '헐!', RED, '😊 대답'),
 ('puppy', 'dizzy', 'look', 'question', None, None, '엥?', PUR, '😊 대답'),
 ('frog', 'sad', 'nox', None, None, None, '아니~', BLUE, '😊 대답'),
 ('cherry', 'joy', 'thumbs', 'hearts', None, None, '좋아요', RED, '😊 대답'),
 ('chick', 'happy', 'nod', 'notes', None, None, '그래그래', GRN, '😊 대답'),
 ('bear', 'shock', 'banzai', 'bang+shine', None, None, '대박!', ORG, '😊 대답'),
 ('cat', 'cool', 'point', 'sparkle', None, None, '콜!', RED, '😊 대답'),
 ('puppy', 'proud', 'thumbs', None, None, 'crown', '당연하지', YEL, '😊 대답'),
 ('bunny', 'shock', 'jump', 'bang', None, None, '진짜?!', PUR, '😊 대답'),
 # 😂 감정 14
 ('cherry', 'love', 'heart', 'hearts', None, None, '사랑해', RED, '😂 감정'),
 ('cat', 'laugh', 'roll', 'sweat', None, None, 'ㅋㅋㅋㅋ', ORG, '😂 감정'),
 ('bear', 'cry', 'rub', None, None, None, '흑흑…', BLUE, '😂 감정'),
 ('chick', 'angry', 'stomp', 'steam+fire', None, None, '부글부글', RED, '😂 감정'),
 ('bunny', 'love', 'shy', 'hearts', None, None, '설레~', PINK, '😂 감정'),
 ('puppy', 'sad', 'slump', 'gloom', None, None, '우울해', BLUE, '😂 감정'),
 ('cat', 'cool', 'dance', 'sparkle+shine', None, None, '멋지지?', ORG, '😂 감정'),
 ('frog', 'shock', 'shiver', 'sweat', None, None, '당황…', BLUE, '😂 감정'),
 ('bunny', 'cry', 'slump', None, None, None, '서운해', BRN, '😂 감정'),
 ('frog', 'tongue', 'dance', None, None, None, '메롱~', GRN, '😂 감정'),
 ('bear', 'shy', 'shy', 'hearts', None, None, '좋아해', PINK, '😂 감정'),
 ('chick', 'dizzy', 'dizzy', 'stars', None, None, '어질어질', PUR, '😂 감정'),
 ('cat', 'sad', 'slump', None, None, None, '심심해', PUR, '😂 감정'),
 ('cherry', 'sad', 'shy', 'hearts', None, None, '보고 싶어', RED, '😂 감정'),
 # 🙏 고마움 8
 ('bear', 'happy', 'bow', 'flowers', None, None, '고마워!', BRN, '🙏 고마움'),
 ('bunny', 'sorry', 'bow', None, None, None, '미안해…', BLUE, '🙏 고마움'),
 ('chick', 'calm', 'bow', 'sparkle', None, None, '감사합니다', ORG, '🙏 고마움'),
 ('puppy', 'cry', 'bow', None, None, None, '잘못했어', BLUE, '🙏 고마움'),
 ('cherry', 'joy', 'heart', 'sparkle', None, None, '덕분이야', RED, '🙏 고마움'),
 ('cat', 'happy', 'present', 'hearts', 'gift', None, '선물이야', PINK, '🙏 고마움'),
 ('frog', 'sorry', 'bow', 'sweat', None, None, '죄송해요', BLUE, '🙏 고마움'),
 ('bunny', 'cry', 'present', 'flowers', 'bouquet', None, '감동이야', PINK, '🙏 고마움'),
 # 🏃 약속 10
 ('chick', 'happy', 'run', 'speed+dust', None, None, '가는 중!', ORG, '🏃 약속'),
 ('bear', 'sorry', 'run', 'speed+sweat', None, None, '늦어서 미안', RED, '🏃 약속'),
 ('cat', 'smile', 'look', 'question', None, None, '어디야?', ORG, '🏃 약속'),
 ('puppy', 'joy', 'banzai', 'confetti', None, None, '도착!', GRN, '🏃 약속'),
 ('frog', 'happy', 'run', 'speed+dust', None, None, '거의 다 왔어', BLUE, '🏃 약속'),
 ('bunny', 'smile', 'look', 'question', None, None, '언제 봐?', GRN, '🏃 약속'),
 ('cherry', 'wink', 'wave', 'sparkle', None, None, '이따 봐!', RED, '🏃 약속'),
 ('cat', 'sorry', 'bow', None, None, None, '조금만 기다려', BLUE, '🏃 약속'),
 ('cherry', 'happy', 'beckon', None, None, None, '여기로 와!', RED, '🏃 약속'),
 ('chick', 'joy', 'wave', None, None, None, '나왔어~', ORG, '🏃 약속'),
 # 🍻 먹고 마시기 10
 ('bear', 'happy', 'toast', None, 'beer', None, '한잔 콜?', ORG, '🍻 먹고 마시기'),
 ('cat', 'calm', 'drink', None, 'coffee', None, '커피 한잔', BRN, '🍻 먹고 마시기'),
 ('puppy', 'joy', 'eat', None, None, None, '밥 먹자!', RED, '🍻 먹고 마시기'),
 ('chick', 'sad', 'belly', 'sweat', None, None, '배고파~', ORG, '🍻 먹고 마시기'),
 ('bunny', 'eat', 'eat', 'hearts', None, None, '냠냠', GRN, '🍻 먹고 마시기'),
 ('frog', 'joy', 'toast', 'sparkle', 'beer', None, '건배!', ORG, '🍻 먹고 마시기'),
 ('bear', 'love', 'eat', 'sparkle', None, None, '맛있다!', YEL, '🍻 먹고 마시기'),
 ('puppy', 'calm', 'belly', None, None, None, '배불러', BRN, '🍻 먹고 마시기'),
 ('cat', 'dizzy', 'dizzy', 'stars', 'beer', None, '취했다~', PUR, '🍻 먹고 마시기'),
 ('bunny', 'smile', 'drink', 'hearts', 'coffee', None, '카페 갈래?', PINK, '🍻 먹고 마시기'),
 # 🎉 축하 10
 ('chick', 'joy', 'present', 'confetti', 'cake', 'party', '생일 축하해', RED, '🎉 축하'),
 ('bear', 'joy', 'clap', 'confetti+clap', None, 'party', '축하해!', ORG, '🎉 축하'),
 ('cherry', 'proud', 'thumbs', 'shine', None, 'crown', '최고야!', ORG, '🎉 축하'),
 ('bunny', 'love', 'present', 'hearts', 'bouquet', 'ribbon', '결혼 축하해', PINK, '🎉 축하'),
 ('cat', 'joy', 'banzai', 'confetti', None, 'grad', '합격 축하!', BLUE, '🎉 축하'),
 ('puppy', 'joy', 'banzai', 'coins', None, None, '부자 되세요', YEL, '🎉 축하'),
 ('frog', 'happy', 'bow', 'confetti', None, 'party', '새해 복!', RED, '🎉 축하'),
 ('chick', 'happy', 'present', 'flowers', 'bouquet', None, '축하드려요', PINK, '🎉 축하'),
 ('bear', 'calm', 'clap', 'sparkle', None, None, '수고했어', BLUE, '🎉 축하'),
 ('cherry', 'joy', 'clap', 'clap+confetti', None, None, '짝짝짝!', PINK, '🎉 축하'),
 # 👴 가족 8
 ('bunny', 'love', 'heart', 'hearts', None, None, '엄마 사랑해', RED, '👴 가족'),
 ('puppy', 'proud', 'thumbs', 'sparkle', None, 'crown', '아빠 최고', BLUE, '👴 가족'),
 ('chick', 'smile', 'present', None, 'bowl', None, '밥은 먹었니?', ORG, '👴 가족'),
 ('bear', 'calm', 'bow', 'flowers', None, None, '건강하세요', GRN, '👴 가족'),
 ('cat', 'cry', 'shy', 'hearts', None, None, '보고 싶어요', PINK, '👴 가족'),
 ('frog', 'joy', 'beckon', 'coins', None, None, '용돈 주세요~', YEL, '👴 가족'),
 ('bunny', 'smile', 'phone', 'ring', 'phone', None, '전화 드릴게요', BLUE, '👴 가족'),
 ('cherry', 'happy', 'heart', 'hearts+sparkle', None, None, '우리 가족 사랑', RED, '👴 가족'),
 # 💪 응원 8
 ('cherry', 'proud', 'fight', 'fire', None, 'band', '힘내!', RED, '💪 응원'),
 ('bear', 'cool', 'thumbs', 'sparkle', None, None, '할 수 있어', ORG, '💪 응원'),
 ('chick', 'angry', 'fight', 'fire', None, 'band', '파이팅!', ORG, '💪 응원'),
 ('frog', 'joy', 'fight', 'sparkle', None, 'band', '아자아자!', RED, '💪 응원'),
 ('puppy', 'happy', 'clap', 'clap', None, None, '잘했어!', GRN, '💪 응원'),
 ('cat', 'proud', 'point', 'shine', None, 'crown', '넌 최고야', BLUE, '💪 응원'),
 ('bunny', 'joy', 'wave2', 'hearts', None, None, '응원해!', PINK, '💪 응원'),
 ('bear', 'calm', 'heart', 'sun', None, None, '다 잘될 거야', BLUE, '💪 응원'),
 # 🗣️ 사투리 4
 ('bear', 'laugh', 'dance', 'notes', None, None, '겁나 좋아잉', BRN, '🗣️ 사투리'),
 ('chick', 'shock', 'roll', 'bang', None, None, '오메 오메!', RED, '🗣️ 사투리'),
 ('cat', 'smile', 'look', 'question', None, None, '뭐 하요?', ORG, '🗣️ 사투리'),
 ('puppy', 'proud', 'nod', None, None, None, '그라제~', GRN, '🗣️ 사투리'),
 # ☔ 날씨·일상 4
 ('frog', 'sad', 'umbrella', 'rain', 'umbrella', None, '비 온다', BLUE, '☔ 날씨·일상'),
 ('bunny', 'shock', 'shiver', 'snow', 'scarf', None, '추워~', BLUE, '☔ 날씨·일상'),
 ('puppy', 'sleepy', 'sleep', 'zzz', None, 'night', '졸려…', PUR, '☔ 날씨·일상'),
 ('bear', 'sad', 'slump', 'gloom', None, None, '퇴근하고 싶다', BRN, '☔ 날씨·일상'),
]


# ---------- 🖌️ 수묵판 (11-23 대표님: 고급스럽게 — 상하이미술영화제작소 수묵 애니메이션처럼 먹의 농담·번짐) ----------
# 같은 캐릭터 그림을 먹으로 바꿈: 진한 테두리 = 마른 붓(비백) 먹선, 몸 칠 = 옅은 먹 + 살짝 담채, 빨강(하트·볼·체리)은 주홍 그대로,
# 번짐(가우스 번짐+종이 결 노이즈), 둥근 화선지(가장자리 들쭉날쭉) + 옅은 엔소(圓相) 붓 원 + 붓글씨(나눔손글씨 붓) + 붉은 낙관 '싸바'
BRUSH = os.path.join(ROOT, 'tools', 'fonts', 'NanumBrushScript-Regular.ttf')
SEALF = os.path.join(ROOT, 'tools', 'fonts', 'SongMyung-Regular.ttf')
PAPER = np.array([246, 239, 222], float); INKC = np.array([28, 24, 22], float); VERM = np.array([196, 48, 40], float)
_paper = {}
def ink_paper(seed):
    if seed in _paper: return _paper[seed]
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:C, 0:C]
    r = np.hypot(xx - CX, yy - C / 2)
    ang = np.arctan2(yy - C / 2, xx - CX)
    edge = 368 + 7 * np.sin(ang * 7 + seed) + 5 * np.sin(ang * 13 + seed * 2) + rng.normal(0, 1.5, (C, C))
    alpha = np.clip((edge - r) / 4, 0, 1)
    fib = Image.fromarray((rng.random((C // 3, C // 3)) * 255).astype(np.uint8)).resize((C, C), Image.BICUBIC).filter(ImageFilter.GaussianBlur(2))
    fib = np.array(fib, float) / 255
    col = PAPER[None, None, :] * (0.975 + 0.03 * fib[..., None])
    # 가장자리 쪽 옅은 먹 물듦
    col = col * (1 - 0.06 * np.clip((r - 300) / 70, 0, 1))[..., None]
    im = Image.fromarray(np.dstack([col, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
    # 엔소 붓 원(옅은 먹, 붓 끝이 갈라짐) + 뒤에 번진 먹 얼룩
    en = Image.new('RGBA', (C, C), (0, 0, 0, 0)); d = ImageDraw.Draw(en)
    st = math.radians(100 + (seed * 37) % 160)
    strands = [(rng.normal(0, 9), rng.uniform(0.75, 1.0)) for _ in range(7)]
    for j in range(260):
        u = j / 259; th = st + u * math.radians(305)
        w = 44 * (1 - u) ** 0.7 + 5
        rr = 296 + 6 * math.sin(u * 9 + seed)
        x, y = CX + rr * math.cos(th), 360 + rr * math.sin(th)
        if u < 0.55:
            ell(d, x, y, w / 2, w / 2, (34, 30, 28, 30 + int(20 * (1 - u))), 0)
        else:  # 붓 끝 갈라짐(비백)
            for off, keep in strands:
                if rng.random() < keep - (u - 0.55):
                    ox_, oy_ = off * math.cos(th), off * math.sin(th)
                    ell(d, x + ox_, y + oy_, 3.5, 3.5, (34, 30, 28, 46), 0)
    ell(d, CX + 40, 330, 210, 170, (40, 36, 34, 22), 0)
    en = en.filter(ImageFilter.GaussianBlur(3))
    im.alpha_composite(en)
    _paper[seed] = (im, fib)
    return _paper[seed]

def to_ink(lay, fib, seed):
    arr = np.array(lay, float) / 255
    rgb, a = arr[..., :3], arr[..., 3]
    L = rgb @ np.array([0.3, 0.59, 0.11])
    sat = rgb.max(-1) - rgb.min(-1)
    red = (rgb[..., 0] > 0.7) & (rgb[..., 1] < 0.36) & (rgb[..., 2] < 0.45) & (sat > 0.45)
    line = L < 0.3
    # 칠: 어두운 색일수록 진한 먹, 흰 것도 아주 옅게
    wash = 0.10 + np.clip(1 - L, 0, 1) * 0.75
    rng = np.random.default_rng(seed)
    st = Image.fromarray((rng.random((C // 2, C // 14)) * 255).astype(np.uint8)).resize((C, C), Image.BICUBIC)
    st = np.array(st, float) / 255
    ink = np.where(line, np.clip(0.6 + 0.8 * st, 0, 1), wash)
    inkA = ink * a
    # 물 번짐: 칠 가장자리에 먹이 고임(진한 테) + 바깥으로 번짐
    a8 = Image.fromarray((a * 255).astype(np.uint8))
    inner = np.array(a8.filter(ImageFilter.GaussianBlur(9)), float) / 255
    pool = np.clip((a - inner) * 2.2, 0, 1) * (~line)
    bl = np.array(Image.fromarray((inkA * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9)), float) / 255
    bl2 = np.array(Image.fromarray((inkA * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6)), float) / 255
    dens = np.clip(np.maximum(bl2 + pool * 0.35, bl * 0.5 * (0.6 + 0.8 * fib)), 0, 1)
    tint = PAPER * 0.85 + rgb * 255 * 0.15
    col = tint * (1 - dens[..., None]) + INKC * dens[..., None]
    redA = np.array(Image.fromarray((red * a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5)), float) / 255
    col = col * (1 - redA[..., None] * 0.8) + VERM * redA[..., None] * 0.8
    aa = np.array(a8.filter(ImageFilter.GaussianBlur(2.5)), float) / 255
    cover = np.clip(np.maximum(aa * 0.97, dens), 0, 1)
    return Image.fromarray(np.dstack([col, cover * 255]).clip(0, 255).astype(np.uint8), 'RGBA')

_inktext = {}
def ink_text(txt, seed):
    if txt in _inktext: return _inktext[txt]
    im = Image.new('RGBA', (C, C), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    txt2 = txt.replace('…', '..')
    size = 150
    while True:
        f = ImageFont.truetype(BRUSH, size)
        if d.textlength(txt2, font=f) <= 400 or size < 60: break
        size -= 5
    d.text((CX - 45, C - 160), txt2, font=f, fill=(28, 24, 22, 255), anchor='mm')
    im = Image.alpha_composite(im.filter(ImageFilter.GaussianBlur(2.2)), im)
    # 낙관
    sd = ImageDraw.Draw(im)
    x0, y0 = CX + 205, C - 215
    sd.rounded_rectangle([x0, y0, x0 + 82, y0 + 104], 8, fill=(196, 40, 36, 235))
    fs = ImageFont.truetype(SEALF, 40)
    sd.text((x0 + 41, y0 + 30), '싸', font=fs, fill=(250, 235, 225, 255), anchor='mm')
    sd.text((x0 + 41, y0 + 74), '바', font=fs, fill=(250, 235, 225, 255), anchor='mm')
    _inktext[txt] = im
    return im

INKZ = 0.72
def ink_frame(row, t, seed):
    sp, expr, pz, fx, held, acc, txt, col = row
    P = pose(pz, t)
    if held == 'umbrella' and not P['pR']: P['pR'] = ('umbrella', 0, 0)
    ch, base, hc = draw_char(sp, expr, P, t, acc, held)
    P2 = dict(P); P2['sx'] *= INKZ / ZOOM; P2['sy'] *= INKZ / ZOOM
    ch = transform(ch, P2, base)
    hc = (base[0] + INKZ * (hc[0] - base[0]), base[1] + INKZ * (hc[1] - base[1]))
    lay = Image.new('RGBA', (C, C), (0, 0, 0, 0))
    fl = Image.new('RGBA', (C, C), (0, 0, 0, 0))
    if fx:
        for n in fx.split('+'):
            if n not in ('confetti', 'rain', 'snow', 'coins', 'flowers'): effect(ImageDraw.Draw(fl), n, t, hc[0], hc[1])
            else: effect(ImageDraw.Draw(fl), n, t, hc[0], hc[1])
    lay.alpha_composite(ch); lay.alpha_composite(fl)
    # 캐릭터를 조금 위로(글씨 자리)
    lay = lay.transform(lay.size, Image.AFFINE, (1, 0, 0, 0, 1, 40), resample=Image.BICUBIC)
    paper, fib = ink_paper(seed)
    out = paper.copy()
    inked = to_ink(lay, fib, seed)
    m = np.array(paper)[..., 3:4] / 255.0
    ia = np.array(inked, float); ia[..., 3] *= m[..., 0]
    out.alpha_composite(Image.fromarray(ia.clip(0, 255).astype(np.uint8), 'RGBA'))
    out.alpha_composite(ink_text(txt, seed))
    return out.resize((FIN, FIN), Image.LANCZOS)

INK = [1, 3, 4, 13, 14, 21, 25, 26, 27, 39, 41, 47, 57, 58, 62, 67, 69, 73, 80, 85, 87, 90, 97, 99]
def make_ink(k, i):
    sp, expr, pz, fx, held, acc, n, c, cat = L[i - 1]
    row = (sp, expr, pz, fx, held, acc, n, c)
    frames = [ink_frame(row, j / NF, i) for j in range(NF)]
    save_gif(frames, os.path.join(OUT, 'i%03d.gif' % k))
    return frames[NF // 4]

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    only = os.environ.get('ONLY')
    sel = [int(x) for x in only.split(',')] if only else None
    if not only:
        for f in os.listdir(OUT):
            if f.endswith('.gif') and not os.environ.get('INKONLY'): os.remove(os.path.join(OUT, f))
    items, thumbs = [], []
    for i, row in enumerate(L, 1):
        sp, expr, pz, fx, held, acc, n, c, cat = row
        items.append({'id': 'e%03d' % i, 'n': n, 'c': cat})
        if (sel and i not in sel) or (os.environ.get('INKONLY') and not sel): continue
        thumbs.append(make(i, (sp, expr, pz, fx, held, acc, n, c)))
        print('.', end='', flush=True)
    print()
    inks = os.environ.get('INKONLY')
    if not only or inks:
        isel = [int(x) for x in inks.split(',')] if inks else None
        for k, i in enumerate(INK, 1):
            items.append({'id': 'i%03d' % k, 'n': L[i - 1][6], 'c': '🖌️ 수묵'})
            if isel and k not in isel: continue
            thumbs.append(make_ink(k, i)); print('i', end='', flush=True)
        print()
    if os.environ.get('SHEET'):
        cols = 10; rows = (len(thumbs) + cols - 1) // cols
        sh = Image.new('RGB', (cols * FIN, rows * FIN), (190, 210, 230))
        for k, im in enumerate(thumbs): sh.paste(im, ((k % cols) * FIN, (k // cols) * FIN), im)
        sh.save('/tmp/emo_sheet.png')
    if not only:
        print(json.dumps(items, ensure_ascii=False))  # emo/index.html의 EMO 목록에 붙여 넣기
    print(len(L), 'rows')
