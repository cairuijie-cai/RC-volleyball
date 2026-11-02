from pathlib import Path
import ezdxf, json
OUT=Path(__file__).resolve().parent
doc=ezdxf.new('R2010',setup=True)
doc.units=4
doc.header['$INSUNITS']=4
doc.styles.new('FANGSONG',dxfattribs={'font':'simfang.ttf'})
for name,color,weight in [('OUTLINE',7,35),('CENTER',8,13),('DIM',7,18),('TEXT',7,18),('ASSUMED',30,18),('FRAME',7,25),('HIDDEN',8,13)]:
    doc.layers.new(name,dxfattribs={'color':color,'lineweight':weight})
m=doc.modelspace()
def line(a,b,layer='OUTLINE'):
    m.add_line(a,b,dxfattribs={'layer':layer})
def rect(x,y,w,h):
    m.add_lwpolyline([(x,y),(x+w,y),(x+w,y+h),(x,y+h)],close=True,dxfattribs={'layer':'OUTLINE'})
def txt(x,y,s,h=1.7,layer='TEXT'):
    m.add_text(s,dxfattribs={'insert':(x,y),'height':h,'style':'FANGSONG','layer':layer})
def hole(x,y,name):
    m.add_circle((x,y),3,dxfattribs={'layer':'OUTLINE'})
    line((x-4,y),(x+4,y),'CENTER');line((x,y-4),(x,y+4),'CENTER')
    txt(x+4,y+2,name,1.5)
def dim(p1,p2,base,angle=0,text='<>',layer='DIM'):
    d=m.add_linear_dim(base=base,p1=p1,p2=p2,angle=angle,text=text,
        dimstyle='EZDXF',override={'dimtxt':1.6,'dimasz':.9,'dimexo':.5,'dimexe':.8,'dimgap':.6,'dimtxsty':'FANGSONG','dimlfac':1,'dimdec':0},
        dxfattribs={'layer':layer})
    d.render()

fx,fy=45,45
rect(fx,fy,19,31);line((fx,fy+2),(fx+19,fy+2))
hole(fx+7,fy+11,'A1');hole(fx+12,fy+23,'A2')
dim((fx,fy+31),(fx+19,fy+31),(fx,fy+35))
dim((fx+19,fy),(fx+19,fy+31),(fx+29,fy),90)
dim((fx,fy+23),(fx,fy+31),(fx-5,fy),90)
dim((fx,fy+11),(fx,fy+23),(fx-5,fy),90)
dim((fx,fy+2),(fx,fy+11),(fx-5,fy),90,'9#','ASSUMED')
dim((fx+7,fy+11),(fx+12,fy+23),(fx,fy+40),0,'5*','ASSUMED')
txt(fx,fy-5,'主视图 / 孔心横向位置假设')

sx,sy=0,45
poly=[(sx,sy),(sx+31,sy),(sx+31,sy+31),(sx+29,sy+31),(sx+29,sy+2),(sx,sy+2)]
m.add_lwpolyline(poly,close=True,dxfattribs={'layer':'OUTLINE'})
dim((sx,sy),(sx+31,sy),(sx,sy-5))
txt(sx,sy+35,'t=2 / 折弯R未知')
txt(sx,sy-10,'右视轮廓 / 圆角未绘')

tx,ty=45,0
rect(tx,ty,19,31);line((tx,ty+29),(tx+19,ty+29))
hole(tx+7,ty+20,'B1');hole(tx+12,ty+8,'B2')
dim((tx,ty),(tx+19,ty),(tx,ty-5))
dim((tx+19,ty),(tx+19,ty+31),(tx+29,ty),90)
txt(tx,ty-10,'俯视图 / 底面孔位假设',layer='ASSUMED')

notes=[
 '31x31x19角码 / 尺寸参考图 / 待实测',
 '单位mm；模型空间1:1；第一角视图布置',
 '依据商品图：外包络31x31x19，t=2，4孔直径6',
 '商家仅说明横向错位约5，未给绝对位置。',
 '* A孔横向X=7/12为居中错位假设。',
 'A孔Y=11/23由顶边距离8、孔距12推算。',
 '# 商品9暂理解为距底板内表面，须核对。',
 '* B孔位参照A面设置，方向及距离待实测。',
 '内折弯R、外圆角、孔口形状、材质、公差未知。',
 '不提供展开图；不按示意猜测沉孔/沉头尺寸。',
 '尺寸未核对前，不用于直接加工。',
 '图号 REF-L3119-01 / 2026-10-14',
]
for i,s in enumerate(notes):txt(86,84-i*4.2,s,1.9,'ASSUMED' if '*' in s or '不用于' in s else 'TEXT')
path=OUT/'31x31x19角码_尺寸参考图_毫米1比1.dxf'
doc.saveas(path)
audit=ezdxf.readfile(path).audit()
assert not audit.has_errors
circles=list(ezdxf.readfile(path).modelspace().query('CIRCLE'))
assert len(circles)==4 and all(abs(x.dxf.radius-3)<1e-8 for x in circles)
(OUT/'DXF结构校验.json').write_text(json.dumps({'readback':True,'audit_errors':len(audit.errors),'hole_count':len(circles),'hole_diameter_mm':6,'units':'mm','model_scale':'1:1','assumed_transverse_centres':[7,12],'native_application_validation':False},ensure_ascii=False,indent=2),encoding='utf-8')
print(str(path))

# The headless preview must use a light-background configuration so ACI7 stays visible.
import os
os.environ['MPLCONFIGDIR']=str(OUT/'tmp_matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from ezdxf.addons.drawing import Frontend, RenderContext
from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
from ezdxf.addons.drawing.config import Configuration, BackgroundPolicy, ColorPolicy
fig=plt.figure(figsize=(13,8),dpi=160)
ax=fig.add_axes([.02,.02,.96,.96]);ax.set_aspect('equal');ax.axis('off')
config=Configuration(background_policy=BackgroundPolicy.WHITE,color_policy=ColorPolicy.COLOR)
Frontend(RenderContext(doc),MatplotlibBackend(ax),config=config).draw_layout(m,finalize=True)
fig.savefig(OUT/'DXF预览.png',facecolor='white',bbox_inches='tight',pad_inches=.08)
plt.close(fig)
