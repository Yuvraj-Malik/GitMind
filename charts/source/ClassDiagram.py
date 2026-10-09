W,H=1250,900
o=[]
F="#fffde7"
def e(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
def t(x,y,s,sz=13,a="start",b=False,i=False): o.append(f'<text x="{x}" y="{y}" font-size="{sz}" text-anchor="{a}"{" font-weight=\"bold\"" if b else ""}{" font-style=\"italic\"" if i else ""}>{e(s)}</text>')
def cls(x,y,w,name,at,op,st=None,it=False):
    hh=26+(15 if st else 0); ha=len(at)*18+8; ho=max(1,len(op))*18+8 if op else 14; h=hh+ha+ho
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{F}" stroke="#000"/>')
    yy=y+17
    if st: t(x+w/2,yy,f"<<{st}>>",11,"middle"); yy+=15
    t(x+w/2,yy,name,13,"middle",True,it)
    o.append(f'<line x1="{x}" y1="{y+hh}" x2="{x+w}" y2="{y+hh}" stroke="#000"/>')
    for k,a in enumerate(at): t(x+5,y+hh+16+k*18,a,12)
    o.append(f'<line x1="{x}" y1="{y+hh+ha}" x2="{x+w}" y2="{y+hh+ha}" stroke="#000"/>')
    for k,a in enumerate(op): t(x+5,y+hh+ha+16+k*18,a,12)
    return x,y,w,h
def ln(*p,d=False): o.append('<polyline points="'+" ".join(f"{a},{b}" for a,b in p)+f'" fill="none" stroke="#000"{" stroke-dasharray=\"5 4\"" if d else ""}/>')

U=cls(50,80,190,"User",["-username: String","-avatarUrl: String","-token: String"],["+login()","+connectRepo()"])
R=cls(370,80,200,"Repository",["-name: String","-owner: String","-defaultBranch: String"],["+sync()"])
P=cls(720,80,200,"PullRequest",["-number: int","-title: String","-status: String"],["+merge()"])
B=cls(370,370,200,"Branch",["-name: String","-headSha: String"],["+runTests(): bool"])
N=cls(50,370,190,"Notification",["-message: String","-isRead: bool"],["+markRead()"])
J=cls(720,370,210,"FixJob",["-jobId: String","-status: Status","-attempts: int"],["+run()","+verify(): bool"],it=True)
A=cls(1030,370,180,"FixerAgent",["-model: String"],["+generatePatch()"])
M=cls(600,660,170,"ManualFix",["-requestedBy: String"],[])
WH=cls(860,660,170,"WebhookFix",["-checkRunId: int"],[])
S=cls(1050,80,150,"Status",["QUEUED","RUNNING","SUCCESS","FAILED"],[],st="enumeration")

def mult(x,y,s): t(x,y,s,12)
# User - Repository
ln((240,130),(370,130)); mult(246,124,"1"); mult(340,124,"*"); t(305,148,"connects",11,"middle")
# Repository - PullRequest
ln((570,130),(720,130)); mult(576,124,"1"); mult(700,124,"*")
# Repository <>- Branch (composition)
rb=R[1]+R[3]; o.append(f'<polygon points="470,{rb} 476,{rb+10} 470,{rb+20} 464,{rb+10}" fill="#000"/>'); ln((470,rb+20),(470,370)); mult(478,240,"1"); mult(478,362,"1..*")
# User - Notification
ln((145,212),(145,370)); mult(152,230,"1"); mult(152,362,"*")
# Branch - FixJob
ln((570,410),(720,410)); mult(576,404,"1"); mult(700,404,"*"); t(645,428,"fixes",11,"middle")
# FixJob - PullRequest
ln((820,370),(820,P[1]+P[3])); mult(828,362,"1"); mult(828,216,"0..1"); t(828,330,"creates",11)
# FixJob - FixerAgent
ln((930,410),(1030,410)); mult(936,404,"1"); mult(1015,404,"1")
# FixJob -> Status
ln((930,385),(980,385),(980,140),(1050,140),d=True); o.append('<polyline points="1040,134 1050,140 1040,146" fill="none" stroke="#000"/>')
# generalization
jx=825; jb=J[1]+J[3]
o.append(f'<polygon points="{jx},{jb} {jx-9},{jb+14} {jx+9},{jb+14}" fill="#fff" stroke="#000"/>')
ln((jx,jb+14),(jx,610)); ln((685,610),(945,610)); ln((685,610),(685,660)); ln((945,610),(945,660))
# one note
o.append('<path d="M596,240 L780,240 L795,255 L795,300 L596,300 Z M780,240 L780,255 L795,255" fill="#fff" stroke="#000"/>')
t(605,262,"PR is created only if all",12); t(605,280,"tests pass after the patch",12)
ln((795,280),(820,280),d=True)
svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><style>text{{font-family:Arial,sans-serif}}</style><rect width="100%" height="100%" fill="#fff"/>'+f'<text x="40" y="40" font-size="18" font-weight="bold">Class Diagram - GitMind</text>'+"\n".join(o)+'</svg>'
open("class.svg","w").write(svg)
