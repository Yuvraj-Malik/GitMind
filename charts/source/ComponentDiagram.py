W,H=1500,1000
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
    w,h=150,96; x,y=cx-w/2,cy-h/2
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff" stroke="#000" stroke-width="3.5"/>')
    for dy in (22,60): o.append(f'<rect x="{x-14}" y="{y+dy-8}" width="30" height="16" fill="#fff" stroke="#000" stroke-width="2.6"/>')
    lbl(x+w/2+8,y+30,name,15,bold=True)
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

# ---------------- artifacts ----------------
page("idx",330,180,"index.html")
page("login",520,120,"login (route)")
page("ai",710,180,"ai-fixes (route)")
lib("app",520,340,"app.js","React SPA bundle")
exe("srv",820,380,"server.js",["Backend API","Express + Socket.io"])
exe("wrk",820,720,"worker.js",["AI Worker","fix-job processor"])
lib("shared",520,560,"shared.js","models · guards · crypto")
lib("bull",820,555,"bullmq","job queue")
lib("oct",1100,555,"octokit","GitHub REST client")
lib("sock",1100,300,"socket.io","live events")
lib("lc",560,860,"langchain-genai","Gemini LLM client")
lib("sg",820,880,"simple-git","clone · commit · push")
file("env",1310,420,".env")
file("prompt",1080,850,"selfHealingPrompt.txt")
file("gm",1300,720,".gitmind.json")
file("readme",1340,170,"README.md",doc=True)
table("t_users",110,560,"users")
table("t_repos",270,560,"repositories")
table("t_prs",110,690,"pullrequests")
table("t_logs",270,690,"ailogs")
table("t_notif",190,820,"notifications")

# ---------------- dependencies ----------------
edge(side("idx","r",0.25),side("login","l",0.45),"«hyperlink»",(410,124))
edge(side("login","r",0.45),side("ai","l",0.25),"«hyperlink»",(632,124))
for k in ("idx","login","ai"): pass
edge(side("idx","b"),side("app","l",0.3),via=[(330,320)])
edge(side("login","b"),side("app","t"))
edge(side("ai","b"),side("app","r",0.3),via=[(710,320)])
edge(side("app","r",0.75),side("srv","l",0.55),"dependency",(650,398),red=True)
lbl(650,412,"HTTPS · WebSocket",11,color="#444")
edge(side("srv","r",0.25),side("sock","l",0.6))
edge(side("srv","b",0.5),side("bull","t"),"enqueue",(780,500))
edge(side("srv","r",0.8),side("oct","t",0.4),via=[(1092,457)])
edge(side("srv","l",0.85),side("shared","t",0.6),via=[(567,462)])
edge(side("srv","r",0.55),side("env","l",0.4),via=[(1200,433),(1200,452)])
edge(side("wrk","t",0.5),side("bull","B"),"consume",(865,668))
edge(side("wrk","l",0.3),side("shared","B",0.6),via=[(567,697)])
edge(side("wrk","r",0.3),side("oct","B",0.4),via=[(1092,697)],label="open PR",lp=(1060,716))
edge(side("wrk","b",0.2),side("lc","r",0.4),via=[(775,820),(640,820)])
edge(side("wrk","b",0.5),side("sg","t"))
edge(side("wrk","b",0.85),side("prompt","t"),via=[(872,795),(1080,795)])
edge(side("wrk","r",0.7),side("gm","l",0.5),via=[(1200,737),(1200,720)])
edge(side("wrk","r",0.12),side("env","r",0.6),via=[(1410,684),(1410,428)])
for t_ in ("t_users","t_repos","t_prs","t_logs","t_notif"):
    pass
edge(side("shared","l",0.2),side("t_repos","r",0.4))
edge(side("shared","l",0.45),side("t_users","t",0.6),via=[(140,574),(140,505)]) if False else None
edge(side("shared","l",0.45),side("t_logs","r",0.4),via=[(400,598),(400,679)])
lbl(410,520,"«table»",12,italic=True)
# group bracket for MongoDB tables
o.append('<rect x="35" y="490" width="320" height="380" rx="8" fill="none" stroke="#000" stroke-width="1" stroke-dasharray="3 3"/>')
lbl(195,508,"MongoDB Atlas (collections)",13,bold=True)

# annotation labels (blue, like the slide)
blue="#1d4ed8"
def ann(x,y,s,tx,ty):
    lbl(x,y,s,14,color=blue)
    sy = y-18 if ty < y else y+6
    o.append(f'<path d="M{x},{sy} Q{x},{(sy+ty)/2} {tx},{ty}" fill="none" stroke="{blue}" stroke-width="1.4"/><circle cx="{tx}" cy="{ty}" r="4" fill="{blue}"/>')
ann(250,90,"page",300,150)
ann(1000,200,"executable",870,333)
ann(1250,230,"library",1120,280)
ann(1440,95,"document",1340,150)
ann(1450,860,"file",1318,742)
ann(120,950,"table",170,812)
ann(400,960,"library",528,872)
# Legend like the slide
lx,ly=40,140
lbl(lx,ly,"Components:",18,anchor="start",color="#b33a3a",bold=True)
for i,s in enumerate(["Executables","Library","Table","File","Document","Page"]): lbl(lx+6,ly+30+i*26,"• "+s,16,anchor="start",color="#b33a3a",bold=True)

svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="none" stroke="#000" stroke-width="1.3"/></marker></defs>
<style>text{{font-family:Arial,Helvetica,sans-serif}}</style>
<rect width="100%" height="100%" fill="#fff"/>
<text x="{W/2}" y="40" text-anchor="middle" font-size="26" font-weight="bold">Git-Mind — Component Diagram</text>
{chr(10).join(o)}
</svg>'''
open("component-diagram.svg","w").write(svg)
