import math, sys
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1]
def star_pts(cx, cy, R, r, n=5, rot=-90):
    p=[]
    for i in range(n*2):
        a=math.radians(rot+i*180/n); rr=R if i%2==0 else r
        p.append((cx+rr*math.cos(a), cy+rr*math.sin(a)))
    return p
def make(S, scale=1.0, bleed=True):
    W=S*4
    im=Image.new('RGB',(W,W))
    d=ImageDraw.Draw(im)
    top=(216,71,94); bot=(110,8,26)
    for y in range(W):
        t=y/W; d.line([(0,y),(W,y)],fill=tuple(int(top[i]*(1-t)+bot[i]*t) for i in range(3)))
    # soft glow
    g=Image.new('L',(W,W),0); gd=ImageDraw.Draw(g)
    c=W/2; R=W*0.36*scale
    gd.ellipse([c-R*1.15,c-R*1.05,c+R*1.15,c+R*1.25],fill=60)
    g=g.filter(ImageFilter.GaussianBlur(W*0.08))
    im.paste(Image.new('RGB',(W,W),(255,214,120)),(0,0),g)
    d=ImageDraw.Draw(im)
    cy=c+W*0.03*scale
    pts=star_pts(c,cy,R,R*0.45)
    # shadow
    sh=Image.new('L',(W,W),0); ImageDraw.Draw(sh).polygon([(x,y+W*0.025) for x,y in pts],fill=120)
    sh=sh.filter(ImageFilter.GaussianBlur(W*0.02)); im.paste((60,0,10),(0,0),sh)
    d=ImageDraw.Draw(im)
    d.polygon(pts,fill=(255,250,238))
    d.polygon(star_pts(c,cy,R*0.62,R*0.28),fill=(255,214,92))
    # tiny cherry pair top-right
    cx2,cy2=c+R*0.74,c-R*0.66; cr=R*0.17
    d.line([(cx2-cr*0.9,cy2+cr*0.2),(cx2+cr*0.2,cy2-cr*2.3)],fill=(86,52,20),width=int(W*0.012))
    d.line([(cx2+cr*1.2,cy2+cr*0.5),(cx2+cr*0.2,cy2-cr*2.3)],fill=(86,52,20),width=int(W*0.012))
    d.ellipse([cx2+cr*0.4-cr*0.6,cy2+cr*1.2-cr*0.6-cr*1.3,cx2+cr*0.4+cr*0.6+cr*0.6,cy2-cr*0.1],fill=(60,150,70))
    for (x,y) in [(cx2-cr*0.9,cy2+cr*0.9),(cx2+cr*1.2,cy2+cr*1.2)]:
        d.ellipse([x-cr,y-cr,x+cr,y+cr],fill=(255,255,255))
        d.ellipse([x-cr*0.82,y-cr*0.82,x+cr*0.82,y+cr*0.82],fill=(200,20,45))
        d.ellipse([x-cr*0.5,y-cr*0.55,x-cr*0.1,y-cr*0.15],fill=(255,170,180))
    return im.resize((S,S),Image.LANCZOS)
make(512).save(out+'/star-icon-512.png',optimize=True)
make(192).save(out+'/star-icon-192.png',optimize=True)
make(180).save(out+'/star-apple-touch.png',optimize=True)
make(512,scale=0.78).save(out+'/star-icon-maskable-512.png',optimize=True)
