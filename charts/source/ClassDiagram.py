W,H=1500,1100
o=[]
def e(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
R=19; HD=28
boxes={}
def cls(key,x,y,w,name,attrs,ops,stereo=None,italic=False):
    hh=HD+(16 if stereo else 0)
    ha=max(1,len(attrs))*R+8; ho=max(1,len(ops))*R+8
    h=hh+ha+ho
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff" stroke="#000" stroke-width="1.3"/>')
    ty=y+18
    if stereo: o.append(f'<text x="{x+w/2}" y="{ty}" class="c">«{e(stereo)}»</text>'); ty+=16
    o.append(f'<text x="{x+w/2}" y="{ty}" class="cb"{" font-style=\"italic\"" if italic else ""}>{e(name)}</text>')
    o.append(f'<line x1="{x}" y1="{y+hh}" x2="{x+w}" y2="{y+hh}" stroke="#000" stroke-width="1.2"/>')
    for i,a in enumerate(attrs): o.append(f'<text x="{x+6}" y="{y+hh+18+i*R}" class="m">{e(a)}</text>')
    o.append(f'<line x1="{x}" y1="{y+hh+ha}" x2="{x+w}" y2="{y+hh+ha}" stroke="#000" stroke-width="1.2"/>')
    for i,a in enumerate(ops): o.append(f'<text x="{x+6}" y="{y+hh+ha+18+i*R}" class="m">{e(a)}</text>')
    boxes[key]=(x,y,w,h); return (x,y,w,h)
def ln(pts,dash=False):
    d=" ".join(f"{'M' if i==0 else 'L'}{x},{y}" for i,(x,y) in enumerate(pts))
    o.append(f'<path d="{d}" fill="none" stroke="#000" stroke-width="1.2"{" stroke-dasharray=\"6 4\"" if dash else ""}/>')
def t(x,y,s,cls="lbl",anchor="start"): o.append(f'<text x="{x}" y="{y}" class="{cls}" text-anchor="{anchor}">{e(s)}</text>')
def diamond(x,y,d):  # filled diamond at (x,y) pointing direction d
    dx,dy={"down":(0,1),"up":(0,-1),"right":(1,0),"left":(-1,0)}[d]
    px,py=-dy,dx
    pts=[(x,y),(x+dx*9+px*6,y+dy*9+py*6),(x+dx*18,y+dy*18),(x+dx*9-px*6,y+dy*9-py*6)]
    o.append('<polygon points="'+" ".join(f"{a},{b}" for a,b in pts)+'" fill="#000" stroke="#000"/>')
def tri(x,y):  # hollow triangle pointing up at (x,y)
    o.append(f'<polygon points="{x},{y} {x-10},{y+16} {x+10},{y+16}" fill="#fff" stroke="#000" stroke-width="1.3"/>')
def arrowhead(x,y,d):
    dx,dy={"down":(0,1),"up":(0,-1),"right":(1,0),"left":(-1,0)}[d]; px,py=-dy,dx
    o.append(f'<path d="M{x-dx*10+px*6},{y-dy*10+py*6} L{x},{y} L{x-dx*10-px*6},{y-dy*10-py*6}" fill="none" stroke="#000" stroke-width="1.2"/>')
def note(x,y,w,lines):
    h=len(lines)*17+16
    o.append(f'<path d="M{x},{y} L{x+w-16},{y} L{x+w},{y+16} L{x+w},{y+h} L{x},{y+h} Z M{x+w-16},{y} L{x+w-16},{y+16} L{x+w},{y+16}" fill="#fff" stroke="#000" stroke-width="1.1"/>')
    for i,l in enumerate(lines): t(x+8,y+20+i*17,l,"n")
    return (x,y,w,h)

# ---------------- classes ----------------
U=cls("U",60,190,230,"User",["+username : String","+avatarUrl : String","-accessToken : String"],["+connectRepository(name)","+mergePullRequest(pr)"])
Rp=cls("R",430,190,250,"Repository",["+fullName : String","+defaultBranch : String","+webhookActive : bool","+lastSyncedAt : Date"],["+sync()","+installWebhook()"])
PR=cls("PR",830,190,250,"PullRequest",["+number : int","+title : String","+status : PRStatus","+url : String"],["+merge()"])
N=cls("N",60,500,230,"Notification",["+title : String","+body : String","+read : bool"],["+markRead()"])
B=cls("B",430,500,250,"Branch",["+name : String","+headSha : String","+aheadBy : int"],["+runTests() : bool"])
C=cls("C",430,800,250,"Commit",["+sha : String","+message : String","+author : String"],[])
FJ=cls("FJ",830,500,250,"FixJob",["+jobId : String","+status : RunStatus","+attempt : int","+errorLog : String"],["+run()","+verify() : bool"],italic=True)
MF=cls("MF",720,820,220,"Manual Fix Job",["+requestedBy : String"],[])
WF=cls("WF",970,820,220,"Webhook Fix Job",["+checkRunId : int","+headSha : String"],[])
FA=cls("FA",1230,500,220,"Fixer Agent",["+model : String","+maxAttempts : int"],["+proposePatch() : Patch"])
PT=cls("PT",1230,780,220,"Patch",["+summary : String","+files : File[]"],["+apply()","+revert()"])
E1=cls("E1",1250,110,160,"RunStatus",["+QUEUED","+RUNNING","+SUCCESS","+FAILED","+SKIPPED"],[],stereo="enumeration")
E2=cls("E2",1250,330,160,"PRStatus",["+OPEN","+MERGED","+CLOSED"],[],stereo="enumeration")

def mid(b,side):
    x,y,w,h=b
    return {"l":(x,y+h/2),"r":(x+w,y+h/2),"t":(x+w/2,y),"b":(x+w/2,y+h)}[side]

# User 1 -- 0..* Repository (connects)
ux,uy=U[0]+U[2],U[1]+60; ln([(ux,uy),(Rp[0],uy)]); t(ux+8,uy-6,"1"); t(Rp[0]-30,uy-6,"0..*"); t((ux+Rp[0])/2,uy+16,"connects","as","middle")
# Repository 1 -- 0..* PullRequest
rx,ry=Rp[0]+Rp[2],Rp[1]+60; ln([(rx,ry),(PR[0],ry)]); t(rx+8,ry-6,"1"); t(PR[0]-30,ry-6,"0..*"); t((rx+PR[0])/2,ry+16,"has","as","middle")
# Repository <>— Branch (composition) 1 -- 1..*
bx=Rp[0]+Rp[2]/2; by=Rp[1]+Rp[3]; diamond(bx,by,"down"); ln([(bx,by+18),(bx,B[1])]); t(bx+8,by+34,"1"); t(bx+8,B[1]-8,"1..*")
# Branch 1 -- 1..* Commit
cx=B[0]+B[2]/2; cy=B[1]+B[3]; ln([(cx,cy),(cx,C[1])]); t(cx+8,cy+18,"1"); t(cx+8,C[1]-8,"1..*"); t(cx-8,(cy+C[1])/2+4,"contains","as","end")
# User 1 -- 0..* Notification
nx=U[0]+U[2]/2; ln([(nx,U[1]+U[3]),(nx,N[1])]); t(nx+8,U[1]+U[3]+18,"1"); t(nx+8,N[1]-8,"0..*"); t(nx-8,(U[1]+U[3]+N[1])/2+4,"receives","as","end")
# User * -- * PullRequest (merges) routed over the top
ln([(U[0]+60,U[1]),(U[0]+60,150),(PR[0]+180,150),(PR[0]+180,PR[1])]); t(U[0]+66,U[1]-8,"1"); t(PR[0]+186,PR[1]-8,"0..*"); t(560,144,"merges (human approval)","as","middle")
# Branch 1 -- 0..* FixJob (targets)
fy=B[1]+50; ln([(B[0]+B[2],fy),(FJ[0],fy)]); t(B[0]+B[2]+8,fy-6,"1"); t(FJ[0]-30,fy-6,"0..*"); t((B[0]+B[2]+FJ[0])/2,fy+16,"targets","as","middle")
# FixJob 0..1 -- 0..1 PullRequest (opens)
px_=FJ[0]+FJ[2]/2; ln([(px_,FJ[1]),(px_,PR[1]+PR[3])]); t(px_+8,FJ[1]-8,"1"); t(px_+8,PR[1]+PR[3]+18,"0..1"); t(px_-8,(FJ[1]+PR[1]+PR[3])/2+4,"opens","as","end")
# FixJob 1 -- 1 Fixer Agent (uses)
ay=FA[1]+40; ln([(FJ[0]+FJ[2],ay),(FA[0],ay)]); arrowhead(FA[0],ay,"right"); t(FJ[0]+FJ[2]+8,ay-6,"1"); t(FA[0]-18,ay-6,"1"); t((FJ[0]+FJ[2]+FA[0])/2,ay+16,"uses","as","middle")
# Fixer Agent 1 -- 1..3 Patch (proposes)
qx=FA[0]+FA[2]/2; ln([(qx,FA[1]+FA[3]),(qx,PT[1])]); t(qx+8,FA[1]+FA[3]+18,"1"); t(qx+8,PT[1]-8,"1..3"); t(qx-8,(FA[1]+FA[3]+PT[1])/2+4,"proposes","as","end")
# Generalization FixJob <|-- Manual / Webhook
gx=FJ[0]+FJ[2]/2; gy=FJ[1]+FJ[3]; tri(gx,gy); ln([(gx,gy+16),(gx,gy+50)]); ln([(MF[0]+MF[2]/2,gy+50),(WF[0]+WF[2]/2,gy+50)])
ln([(MF[0]+MF[2]/2,gy+50),(MF[0]+MF[2]/2,MF[1])]); ln([(WF[0]+WF[2]/2,gy+50),(WF[0]+WF[2]/2,WF[1])])
# Enum usage (dependencies)
ln([(PR[0]+PR[2],PR[1]+75),(E2[0],E2[1]+30)],dash=True); arrowhead(E2[0],E2[1]+30,"right")
ln([(FJ[0]+FJ[2],FJ[1]+20),(1180,FJ[1]+20),(1180,E1[1]+60),(E1[0],E1[1]+60)],dash=True); arrowhead(E1[0],E1[1]+60,"right")

# ---------------- notes (constraints) ----------------
n1=note(800,62,400,["{A PullRequest is opened by a FixJob only if","every test on the Branch passes}"])
ln([(1000,n1[1]+n1[3]),(1000,PR[1])],dash=True)
n2=note(60,62,300,["{Git-Mind never merges: a merge is","always performed by a User}"])
ln([(200,n2[1]+n2[3]),(200,150)],dash=True)
n3=note(560,1000,330,["{Branches named ai/fix-* never","trigger a new Webhook Fix Job}"])
ln([(890,1030),(WF[0]+40,WF[1]+WF[3])],dash=True)
n4=note(1120,1000,350,["{A Patch may not modify test files and is","reverted if verification fails}"])
ln([(1340,1000),(1340,PT[1]+PT[3])],dash=True)

svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<style>text{{font-family:Arial,Helvetica,sans-serif;fill:#000}}
.cb{{font-size:15px;font-weight:bold;text-anchor:middle}} .c{{font-size:12px;text-anchor:middle}}
.m{{font-size:13px}} .lbl{{font-size:13px;fill:#b45309}} .as{{font-size:12px;font-style:italic;fill:#333}} .n{{font-size:13px}}</style>
<rect width="100%" height="100%" fill="#fff"/>
<text x="{W/2}" y="38" text-anchor="middle" font-size="24" font-weight="bold">Git-Mind — Class Diagram</text>
{chr(10).join(o)}
</svg>'''
open("class-diagram.svg","w").write(svg)
