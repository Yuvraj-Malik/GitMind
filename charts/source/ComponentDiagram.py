W,H=1200,820
o=[]
def e(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
P={}
def lbl(x,y,s,size=14,anchor="middle",color="#000",bold=False,italic=False):
    o.append(f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" fill="{color}"{" font-weight=\"bold\"" if bold else ""}{" font-style=\"italic\"" if italic else ""}>{e(s)}</text>')
def docshape(x,y,w,h,f=16):
    o.append(f'<path d="M{x},{y} L{x+w-f},{y} L{x+w},{y+f} L{x+w},{y+h} L{x},{y+h} Z" fill="#fff" stroke="#000" stroke-width="1.4"/>')
    o.append(f'<path d="M{x+w-f},{y} L{x+w-f},{y+f} L{x+w},{y+f}" fill="none" stroke="#000" stroke-width="1.2"/>')
def page(k,cx,cy,name):
    w,h=74,96; x,y=cx-w/2,cy-h/2; docshape(x,y,w,h)
    o.append(f'<circle cx="{cx-6}" cy="{y+30}" r="13" fill="#777"/><path d="M{cx-14},{y+24} q6,-6 10,2 q4,8 10,0 M{cx-10},{y+38} q6,-4 10,0" stroke="#ccc" stroke-width="2" fill="none"/>')
    for i in range(4): o.append(f'<line x1="{x+8}" y1="{y+56+i*8}" x2="{x+w-8}" y2="{y+56+i*8}" stroke="#555" stroke-width="1.6"/>')
    lbl(cx,y-8,name); P[k]=(x,y,w,h)
def gear(cx,cy,r):
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#bbb" stroke-width="{r*0.55}" stroke-dasharray="{r*0.42} {r*0.42}"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.72}" fill="#bbb"/><circle cx="{cx}" cy="{cy}" r="{r*0.3}" fill="#fff"/>')
def lib(k,cx,cy,name,sub=None):
    w,h=78,98; x,y=cx-w/2,cy-h/2; docshape(x,y,w,h)
    gear(cx-10,cy-12,15); gear(cx+14,cy+18,12)
    lbl(cx,y+h+17,name)
    if sub: lbl(cx,y+h+32,sub,11,color="#444",italic=True)
    P[k]=(x,y,w,h)
def exe(k,cx,cy,name,sub=None):
    w,h=150,72; x,y=cx-w/2,cy-h/2
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff" stroke="#000" stroke-width="3"/>')
    for dy in (20,50): o.append(f'<rect x="{x-14}" y="{y+dy-8}" width="30" height="16" fill="#fff" stroke="#000" stroke-width="2.6"/>')
    lbl(x+w/2+8,y+h/2+5,name,15,bold=True)
    if sub:
        for i,s in enumerate(sub): lbl(x+w/2+8,y+52+i*16,s,11,color="#333")
    P[k]=(x,y,w,h)
def table(k,cx,cy,name):
    w,h=110,62; x,y=cx-w/2,cy-h/2
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff" stroke="#000" stroke-width="1.4"/>')
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="16" fill="#ddd" stroke="#000" stroke-width="1.2"/>')
    for i in (1,2): o.append(f'<line x1="{x}" y1="{y+16+i*15}" x2="{x+w}" y2="{y+16+i*15}" stroke="#000" stroke-width="0.8"/>')
    for i in (1,2): o.append(f'<line x1="{x+i*w/3}" y1="{y}" x2="{x+i*w/3}" y2="{y+h}" stroke="#000" stroke-width="0.8"/>')
    lbl(cx,y+h+16,name,13); P[k]=(x,y,w,h)
def file(k,cx,cy,name,doc=False):
    w,h=62,80; x,y=cx-w/2,cy-h/2
    if doc:
        o.append(f'<path d="M{x},{y} L{x+w-14},{y} L{x+w},{y+14} L{x+w},{y+h-8} q-{w/4},-10 -{w/2},0 q-{w/4},10 -{w/2},0 Z" fill="#fff" stroke="#000" stroke-width="1.4"/>')
        o.append(f'<path d="M{x+w-14},{y} L{x+w-14},{y+14} L{x+w},{y+14}" fill="none" stroke="#000" stroke-width="1.2"/>')
    else: docshape(x,y,w,h,14)
    for i in range(5 if doc else 6): o.append(f'<line x1="{x+8}" y1="{y+22+i*8}" x2="{x+w-10}" y2="{y+22+i*8}" stroke="#555" stroke-width="1.4"/>')
    lbl(cx,y+h+16,name,13); P[k]=(x,y,w,h)

def edge(a,b,label=None,lp=None,via=None,red=False):
    pts=[a]+(via or [])+[b]; d=" ".join(f"{'M' if i==0 else 'L'}{x},{y}" for i,(x,y) in enumerate(pts))
    o.append(f'<path d="{d}" fill="none" stroke="#000" stroke-width="1.2" stroke-dasharray="6 5" marker-end="url(#a)"/>')
    if label:
        x,y=lp if lp else ((pts[-2][0]+b[0])/2,(pts[-2][1]+b[1])/2-6)
        lbl(x,y,label,12,color="#d00000" if red else "#000",bold=red)
def side(k,s,f=0.5):
    x,y,w,h=P[k]
    if s=="B": return (x+w*f,y+h+38)   # below a library's name + subtitle
    return {"l":(x,y+h*f),"r":(x+w,y+h*f),"t":(x+w*f,y),"b":(x+w*f,y+h)}[s]


page("idx",150,160,"index.html")
page("dash",380,160,"dashboard.html")
lib("app",265,370,"app.js")
exe("srv",640,370,"server.js")
exe("wrk",640,640,"worker.js")
lib("shared",380,560,"shared.js")
lib("bull",890,505,"bullmq")
lib("oct",1060,370,"octokit")
lib("lc",900,690,"langchain")
table("db",150,620,"gitmind_db")
file("env",1060,160,".env")

edge(side("idx","r",0.3),side("dash","l",0.3),"<<hyperlink>>",(265,132))
edge(side("idx","b"),side("app","l",0.4),via=[(150,359)])
edge(side("dash","b"),side("app","r",0.4),via=[(380,359)])
edge(side("app","r",0.5),side("srv","l",0.5),"dependency",(452,360),red=True)
edge(side("srv","r",0.5),side("oct","l",0.5))
edge(side("srv","t",0.7),side("env","l",0.5),via=[(670,160)])
edge(side("srv","b",0.8),side("bull","l",0.3))
edge(side("srv","b",0.2),side("shared","t",0.5),via=[(595,460),(380,460)])
edge(side("wrk","r",0.3),side("bull","l",0.7))
edge(side("wrk","r",0.15),side("oct","r",0.5),via=[(1150,615),(1150,370)])
edge(side("wrk","r",0.7),side("lc","l",0.5))
edge(side("wrk","l",0.5),side("shared","r",0.6))
edge(side("shared","l",0.5),side("db","r",0.5))
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="none" stroke="#000" stroke-width="1.3"/></marker></defs>
<style>text{{font-family:Arial,Helvetica,sans-serif}}</style>
<rect width="100%" height="100%" fill="#fff"/>
<text x="40" y="44" font-size="20" font-weight="bold">Component Diagram - GitMind</text>
{chr(10).join(o)}
</svg>'''
open("component.svg","w").write(svg)
