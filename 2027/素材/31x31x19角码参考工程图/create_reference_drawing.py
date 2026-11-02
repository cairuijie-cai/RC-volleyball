from pathlib import Path
import math, json, html
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import mm

OUT = Path(__file__).resolve().parent
PDF = OUT / '31x31x19角码_尺寸参考图_待实测.pdf'
SVG = OUT / '31x31x19角码_尺寸参考图_待实测.svg'
pdfmetrics.registerFont(TTFont('FangSong', r'C:\Windows\Fonts\simfang.ttf'))
c = canvas.Canvas(str(PDF), pagesize=(297*mm, 210*mm))
c.setTitle('31×31×19角码尺寸参考图（待实测）')
c.setAuthor('依据用户提供商品尺寸图与商家聊天整理')
sv = ['<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 297 210"><rect width="297" height="210" fill="white"/>']
ents = []
BLACK = '#171717'; DIM = '#303030'; ASSUME = '#a14e14'; CENTER = '#777777'

def line(x1,y1,x2,y2,w=.22,color=BLACK,dash=None,layer='OUTLINE'):
    c.setStrokeColor(color); c.setLineWidth(w*mm)
    c.setDash([v*mm for v in dash] if dash else [])
    c.line(x1*mm,y1*mm,x2*mm,y2*mm)
    ds = f' stroke-dasharray="{" ".join(map(str,dash))}"' if dash else ''
    sv.append(f'<line x1="{x1}" y1="{210-y1}" x2="{x2}" y2="{210-y2}" stroke="{color}" stroke-width="{w}"{ds}/>')
    ents.append(dict(type='line',start=[x1,y1],end=[x2,y2],layer=layer))

def rect(x,y,w,h,lw=.3,color=BLACK,layer='FRAME'):
    for a,b in [((x,y),(x+w,y)),((x+w,y),(x+w,y+h)),((x+w,y+h),(x,y+h)),((x,y+h),(x,y))]:
        line(*a,*b,lw,color,layer=layer)

def circle(x,y,r,w=.45,color=BLACK,layer='OUTLINE'):
    c.setStrokeColor(color); c.setLineWidth(w*mm); c.setDash()
    c.circle(x*mm,y*mm,r*mm,stroke=1,fill=0)
    sv.append(f'<circle cx="{x}" cy="{210-y}" r="{r}" fill="none" stroke="{color}" stroke-width="{w}"/>')
    ents.append(dict(type='circle',center=[x,y],radius=r,layer=layer))

def text(x,y,s,h=3,color=BLACK,align='left',layer='TEXT'):
    c.setFillColor(color); c.setFont('FangSong',h*mm)
    fn = {'left':c.drawString,'center':c.drawCentredString,'right':c.drawRightString}[align]
    fn(x*mm,y*mm,s)
    anchor = {'left':'start','center':'middle','right':'end'}[align]
    sv.append(f'<text x="{x}" y="{210-y}" font-family="FangSong,仿宋,SimSun,serif" font-size="{h}" text-anchor="{anchor}" fill="{color}">{html.escape(s)}</text>')
    ents.append(dict(type='text',point=[x,y],text=s,height=h,align=align,layer=layer))

def arrow(x,y,dx,dy,color=DIM):
    size=1.35; wing=.42
    for k in (-1,1):
        line(x,y,x+dx*size-dy*wing*k,y+dy*size+dx*wing*k,.18,color,layer='DIM')

def hdim(x1,x2,refy,y,s,color=DIM):
    toward=1 if y>refy else -1
    line(x1,refy+toward*.7,x1,y+toward*1.4,.16,color,layer='DIM')
    line(x2,refy+toward*.7,x2,y+toward*1.4,.16,color,layer='DIM')
    line(x1,y,x2,y,.16,color,layer='DIM'); arrow(x1,y,1,0,color); arrow(x2,y,-1,0,color)
    text((x1+x2)/2,y+1.1,s,3,color,'center','DIM_TEXT')
    ents.append(dict(type='dimension',kind='horizontal',p1=[x1,refy],p2=[x2,refy],base=[x1,y],text=s,layer='DIM'))

def vdim(y1,y2,refx,x,s,color=DIM):
    toward=1 if x>refx else -1
    line(refx+toward*.7,y1,x+toward*1.4,y1,.16,color,layer='DIM')
    line(refx+toward*.7,y2,x+toward*1.4,y2,.16,color,layer='DIM')
    line(x,y1,x,y2,.16,color,layer='DIM'); arrow(x,y1,0,1,color); arrow(x,y2,0,-1,color)
    text(x+1.6,(y1+y2)/2-1,s,3,color,layer='DIM_TEXT')
    ents.append(dict(type='dimension',kind='vertical',p1=[refx,y1],p2=[refx,y2],base=[x,y1],text=s,layer='DIM'))

def hole(x,y,id):
    circle(x,y,6)
    line(x-8,y,x+8,y,.15,CENTER,[4,1,1,1],'CENTER')
    line(x,y-8,x,y+8,.15,CENTER,[4,1,1,1],'CENTER')
    text(x+7,y+4,id,2.8)

# A4 landscape sheet. Millimetres; enlargement 2:1 for all views.
rect(5,5,287,200,.35)
text(12,197,'31×31×19 L 形角码 / 尺寸参考图',5)
text(12,192,'依据商品图整理；棕色尺寸及底面孔位为假设，须实测核对。',3.2,ASSUME)

S=2
# Front, origin at outer lower-left corner. X centres 7/12 are assumed.
fx,fy=137,112
rect(fx,fy,19*S,31*S,.48,layer='OUTLINE')
line(fx,fy+2*S,fx+19*S,fy+2*S,.3)
hole(fx+7*S,fy+11*S,'A1'); hole(fx+12*S,fy+23*S,'A2')
text(fx+19,fy-8,'主视图（竖直面）',3.2,align='center')
hdim(fx,fx+38,fy+62,182,'19')
vdim(fy,fy+62,fx+38,194,'31')
vdim(fy+46,fy+62,fx,127,'8')
vdim(fy+22,fy+46,fx,127,'12')
vdim(fy+4,fy+22,fx,127,'9#',ASSUME)
text(135,108,'O_A',2.5)
# Indicative transverse offset, with its exact absolute position explicitly assumed.
line(fx+14,fy+22,fx+14,fy+77,.16,ASSUME,[2,1],layer='ASSUMED')
line(fx+24,fy+46,fx+24,fy+77,.16,ASSUME,[2,1],layer='ASSUMED')
hdim(fx+14,fx+24,fy+62,187,'≈5*',ASSUME)

# Right-hand view at left of front under first-angle projection.
sx,sy=34,112
poly=[(sx,sy),(sx+62,sy),(sx+62,sy+62),(sx+58,sy+62),(sx+58,sy+4),(sx,sy+4),(sx,sy)]
for a,b in zip(poly,poly[1:]): line(*a,*b,.48)
hdim(sx,sx+62,sy,103,'31')
text(sx+31,sy-16,'右视轮廓（折弯圆角未绘）',3,align='center')
line(sx+59.6,sy+46,sx+43,sy+50,.2,layer='DIM')
line(sx+43,sy+50,sx+28,sy+50,.2,layer='DIM')
text(sx+27,sy+49.2,'t=2',3,align='right')
line(sx+59,sy+8,sx+71,sy+14,.2,ASSUME,layer='ASSUMED')
text(sx+71,sy+16,'R 未知',2.8,ASSUME)

# First-angle top view below front. Depth coordinates are reference assumptions.
tx,ty=137,35
rect(tx,ty,38,62,.48,layer='OUTLINE')
line(tx,ty+58,tx+38,ty+58,.3)
hole(tx+14,ty+40,'B1'); hole(tx+24,ty+16,'B2')
text(tx+19,ty-9,'俯视图（底面孔位假设）',3,ASSUME,'center')
vdim(ty,ty+62,tx+38,194,'31')
hdim(tx,tx+38,ty,22,'19')
text(tx-2,ty+65,'O_B',2.5)

# Hole schedule uses local face coordinates in physical millimetres.
text(212,175,'孔位表（单位 mm）',3.4)
tabx,taby,tabw,rowh=212,136,72,7
rect(tabx,taby,tabw,rowh*5,.22)
for i in range(1,5): line(tabx,taby+i*rowh,tabx+tabw,taby+i*rowh,.15)
for x in (tabx+19,tabx+35,tabx+53): line(x,taby,x,taby+rowh*5,.15)
rows=[('孔号','X*','Y','孔径'),('A1','7*','11#','φ6'),('A2','12*','23#','φ6'),('B1','7*','11*','φ6'),('B2','12*','23*','φ6')]
for i,row in enumerate(rows):
    y=taby+(4-i)*rowh+2
    for x,s in zip((tabx+9.5,tabx+27,tabx+44,tabx+62.5),row): text(x,y,s,2.9,ASSUME if '*' in s or '#' in s else BLACK,'center')
notes=[
 'A 面：X 向右，Y 向上，原点 O_A。',
 'B 面：X 向右，Y 向下，原点 O_B。',
 '4 个孔均按 φ6 通孔示意。',
 '* X=7/12 为居中错位约5的假设。',
 '  商家未确认到侧边的准确距离。',
 '* B 面纵向位置暂参照 A 面设置。',
 '# A 面 Y=23/11 由31、8、12推算。',
 '  9的起点暂按底板内表面理解；',
 '  8+12+9=29，加板厚2得到31。',
 '  这一尺寸基准须对照实物核对。',
 '材质、折弯R、外圆角、孔口形状、',
 '公差及表面处理均未提供。',
 '不按图片补造沉孔或沉头尺寸。',
 '未核对的尺寸不用于直接加工。',
]
for i,n in enumerate(notes): text(212,129-i*5.2,n,2.85,ASSUME if '*' in n or '未核对' in n else BLACK)

# Notes at lower-left keep dimensional basis separate from unknown manufacturing data.
text(15,77,'已给出的商品参数',3.6)
for i,n in enumerate(['外包络：31×31×19 mm','板厚：2 mm；孔径：6 mm','竖直面尺寸链：8 / 12 / 9 mm','孔横向错位：商家称约5 mm','尺寸未给公差；比例仅供阅图']):
    text(15,69-i*6,n,3)
text(15,31,'视图按直角轮廓示意，实际折弯处有圆角。',2.8)

# Compact title block.
rect(206,5,86,24,.25)
line(206,17,292,17,.2)
line(246,5,246,17,.2)
text(209,21,'名称：L形角码尺寸参考图',3)
text(209,9,'图号：REF-L3119-01',2.8)
text(249,9,'比例2:1 / A4 / 2026-10-14',2.6)
text(12,9,'状态：参考 / 待实测       来源：用户提供商品图及商家回复       非厂家正式加工图',2.8,ASSUME)

c.showPage(); c.save()
sv.append('</svg>'); SVG.write_text('\n'.join(sv),encoding='utf-8')
(OUT/'drawing_entities.json').write_text(json.dumps(ents,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'尺寸依据与待确认项.md').write_text('''# 31×31×19角码尺寸参考图

依据用户提供的商品尺寸图与聊天截图整理，不是厂家原始工程图。

商品图标注外包络31×31×19 mm、厚度2 mm、孔径6 mm，以及竖直面8/12/9 mm尺寸链。商家称两孔横向错位约5 mm，没有确认准确的侧边距。

## 图中的假设

- 横向孔中心暂按7 mm、12 mm示意，等于在19 mm宽度中对称偏置±2.5 mm；准确坐标未知。
- 竖直面孔心由上边向下8 mm、再向下12 mm推算，得到从外包络底边向上23 mm、11 mm。
- 9 mm的基准暂理解为底板内表面；8+12+9=29 mm，加厚度2 mm得到31 mm。这不是实物测量。
- 底面孔心沿腿长暂参照竖直面，准确纵向距离及横向错位方向均需实测。
- 外圆角、内折弯半径、孔口是否沉孔/沉头/翻边、材质、表面处理、公差没有资料，因此未补造。
- 侧视折弯处采用直角轮廓示意，不提供展开图或下料尺寸。

PDF/SVG用于尺寸沟通和装配参考。DXF几何按毫米1:1建立，布局为独立参考视图，并以原生DIMENSION实体记录基本尺寸；没有用AutoCAD或SolidWorks原生打开验收，不是SLDDRW/DWG。

核对实物时至少测量两面的每个孔心到同一侧边、自由端边的距离，以及内折弯R和孔口形状。配套零件的匹配孔位应以该实测值为准。
''',encoding='utf-8')
print(json.dumps({'pdf':str(PDF),'svg':str(SVG),'primitives':len(ents)},ensure_ascii=False))
