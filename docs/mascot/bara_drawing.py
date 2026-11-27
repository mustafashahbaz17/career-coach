# Builds Bara the capybara as SVG: one base body + pose-specific parts. Renders a preview sheet.
FUR="#B57E4B"; FUR_D="#94623A"; FUR_L="#C99560"; INK="#2E1F14"
GREEN="#0F6E5A"; GREEN_D="#0B5847"; ORANGE="#FF8A1F"; ORANGE_D="#E06A00"; LEAF="#3DDC97"

def orange(x,y,r=15,rot=0):
    return f'''<g transform="translate({x} {y}) rotate({rot})">
  <circle r="{r}" fill="{ORANGE}"/>
  <circle r="{r}" fill="url(#oshade)"/>
  <ellipse cx="{-r*.35}" cy="{-r*.4}" rx="{r*.28}" ry="{r*.18}" fill="#fff" opacity=".55"/>
  <path d="M0 {-r} q1 -5 -1 -8" stroke="#5B3A1A" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M1 {-r-6} q9 -8 16 -2 q-8 7 -16 2z" fill="{LEAF}"/>
</g>'''

def eyes(mode="calm"):
    L,R,Y=88,152,84
    if mode=="calm":   # small, sleepy, content
        return f'''<g fill="{INK}"><ellipse cx="{L}" cy="{Y}" rx="5" ry="5.5"/><ellipse cx="{R}" cy="{Y}" rx="5" ry="5.5"/></g>
<g fill="#fff"><circle cx="{L+1.6}" cy="{Y-1.8}" r="1.5"/><circle cx="{R+1.6}" cy="{Y-1.8}" r="1.5"/></g>
<path d="M{L-8} {Y-3} q8 -5 16 0 M{R-8} {Y-3} q8 -5 16 0" stroke="{FUR_D}" stroke-width="4.5" fill="none" stroke-linecap="round"/>'''
    if mode=="happy":
        return f'<path d="M{L-7} {Y+2} q7 -8 14 0 M{R-7} {Y+2} q7 -8 14 0" stroke="{INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
    if mode=="brow":
        return eyes("calm") + f'<path d="M{R-9} {Y-13} q9 -7 18 -1" stroke="{INK}" stroke-width="3" fill="none" stroke-linecap="round"/>'
    if mode=="closed":
        return f'<path d="M{L-7} {Y} q7 4 14 0 M{R-7} {Y} q7 4 14 0" stroke="{INK}" stroke-width="3" fill="none" stroke-linecap="round"/>'

def head(eye="calm", blush=True):
    return f'''
<!-- tiny ears, set high -->
<ellipse cx="70" cy="58" rx="9" ry="8" fill="{FUR_D}"/><ellipse cx="170" cy="58" rx="9" ry="8" fill="{FUR_D}"/>
<ellipse cx="70" cy="59" rx="4" ry="3.4" fill="#6E4527"/><ellipse cx="170" cy="59" rx="4" ry="3.4" fill="#6E4527"/>
<!-- boxy head with a flat top -->
<path d="M58 96 q0 -40 34 -40 h56 q34 0 34 40 v26 q0 44 -62 44 q-62 0 -62 -44z" fill="{FUR}"/>
<path d="M70 70 q6 -12 24 -12 h52 q18 0 24 12" stroke="{FUR_L}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".55"/>
<!-- long, blunt muzzle -->
<path d="M74 112 q0 -18 22 -18 h48 q22 0 22 18 v18 q0 30 -46 30 q-46 0 -46 -30z" fill="{FUR_D}"/>
<!-- the wide capybara nose -->
<path d="M100 106 h40 q8 0 6 7 q-4 10 -26 10 q-22 0 -26 -10 q-2 -7 6 -7z" fill="#4A2F1C"/>
<path d="M106 110 q4 3 8 1 M126 111 q4 2 8 -1" stroke="#1E130B" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M120 123 v9 M110 136 q10 7 20 0" stroke="{INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
{eyes(eye)}
{f'<ellipse cx="74" cy="104" rx="7" ry="4" fill="#FF9A6B" opacity=".42"/><ellipse cx="166" cy="104" rx="7" ry="4" fill="#FF9A6B" opacity=".42"/>' if blush else ''}'''

def body(blazer=True):
    b = f'<ellipse cx="120" cy="190" rx="74" ry="58" fill="{FUR}"/>'
    if blazer:
        b += f'''
<path d="M50 186 q0 -38 40 -46 l30 40 l30 -40 q40 8 40 46 v44 q-70 14 -140 0z" fill="{GREEN}"/>
<path d="M90 140 l30 40 l30 -40 q-30 -6 -60 0z" fill="#F4F7F5"/>
<path d="M90 140 l14 46 l16 -6 z M150 140 l-14 46 l-16 -6 z" fill="{GREEN_D}"/>
<!-- lanyard + badge -->
<path d="M106 150 l14 32 l14 -32" stroke="{ORANGE}" stroke-width="3.5" fill="none" stroke-linejoin="round"/>
<rect x="110" y="180" width="20" height="25" rx="3.5" fill="#fff" stroke="#DCE6E1"/>
<rect x="114" y="186" width="12" height="3" rx="1.5" fill="{GREEN}"/><rect x="114" y="192" width="8" height="2.5" rx="1.2" fill="#B9C7C0"/>
<circle cx="72" cy="208" r="2.6" fill="{GREEN_D}"/><circle cx="168" cy="208" r="2.6" fill="{GREEN_D}"/>'''
    return b

def paw(x,y,rot=0): return f'<g transform="translate({x} {y}) rotate({rot})"><rect x="-11" y="-18" width="22" height="36" rx="11" fill="{GREEN}"/><ellipse cx="0" cy="-20" rx="11" ry="9" fill="{FUR_D}"/></g>'

def arm(sx,sy,ex,ey):
    """A sleeve from the shoulder (sx,sy) to the paw (ex,ey)."""
    return (f'<path d="M{sx} {sy} L{ex} {ey}" stroke="{GREEN}" stroke-width="22" stroke-linecap="round"/>'
            f'<path d="M{sx} {sy} L{ex} {ey}" stroke="{GREEN_D}" stroke-width="22" stroke-linecap="round" opacity=".18"/>'
            f'<circle cx="{ex}" cy="{ey}" r="11" fill="{FUR_D}"/>')

DEFS=f'''<defs><radialGradient id="oshade" cx=".35" cy=".3" r=".8"><stop offset=".55" stop-color="{ORANGE}" stop-opacity="0"/><stop offset="1" stop-color="{ORANGE_D}" stop-opacity=".55"/></radialGradient>
<radialGradient id="bath" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#8FE3C6"/><stop offset="1" stop-color="#3DB58F"/></radialGradient></defs>'''

def svg(inner, vb="0 0 240 250"): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="240" height="250">{DEFS}{inner}</svg>'

POSES={}
# 1. Hello: waving with one arm, clipboard tucked under the other
POSES["hello"]=svg(body()+arm(170,172,186,186)+f'''<g transform="translate(176 160) rotate(10)"><rect x="-4" y="-26" width="38" height="48" rx="5" fill="#fff" stroke="#DCE6E1"/><rect x="8" y="-30" width="14" height="8" rx="2" fill="{FUR_D}"/>
<rect x="3" y="-14" width="26" height="3" rx="1.5" fill="#B9C7C0"/><rect x="3" y="-6" width="20" height="3" rx="1.5" fill="#B9C7C0"/><path d="M3 4 l4 4 l8 -9" stroke="{GREEN}" stroke-width="3" fill="none" stroke-linecap="round"/></g>'''
   + arm(68,168,40,128) + head("calm") + orange(120,40)
   + '<path d="M18 112 q-6 8 0 16 M26 102 q-10 14 0 30" stroke="#FFB266" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>')
# 2. Deadline: holding a stopwatch, one eyebrow up, a tiny sweat drop
POSES["deadline"]=svg(body()+arm(70,172,96,196)+arm(170,172,150,196)+f'''<g transform="translate(124 198)"><circle r="20" fill="#fff" stroke="{GREEN_D}" stroke-width="4"/><rect x="-5" y="-29" width="10" height="7" rx="2" fill="{GREEN_D}"/>
<path d="M0 0 v-12 M0 0 l8 5" stroke="{ORANGE_D}" stroke-width="3.2" stroke-linecap="round"/><circle r="2.4" fill="{INK}"/></g>'''
   + head("brow", blush=False) + orange(120,40,15,-8)
   + f'<path d="M182 92 q5 9 0 13 q-5 -4 0 -13z" fill="#7FD4FF"/>')
# 3. Oops (rejection): the orange has rolled off; Bara is unbothered
POSES["oops"]=svg(body()+arm(70,172,84,204)+arm(170,172,156,204)+head("calm")+orange(204,228,14,40)
   + '<path d="M152 220 q16 6 32 6" stroke="#C9D9D2" stroke-width="2.4" fill="none" stroke-dasharray="3 5" stroke-linecap="round"/>'
   + '<text x="146" y="44" font-family="Plus Jakarta Sans,Arial" font-size="22" font-weight="800" fill="#94623A">…</text>')
# 4. Offer: a whole stack of oranges, both arms up
POSES["offer"]=svg(body()+arm(68,170,36,124)+arm(172,170,204,124)
   + head("happy") + orange(120,42,15) + orange(107,16,13,-10) + orange(133,16,13,12) + orange(120,-8,12)
   + ''.join(f'<rect x="{x}" y="{y}" width="6" height="11" rx="2" fill="{c}" transform="rotate({r} {x} {y})"/>' for x,y,c,r in [(22,60,"#FF8A1F",20),(212,70,"#3DDC97",-25),(46,96,"#FBBF24",40),(194,104,"#FF8A1F",-10),(206,30,"#FBBF24",15),(30,24,"#3DDC97",-30)]),
   vb="0 -34 240 284")
# 5. Vent: chin-deep in a warm tub, eyes closed, blazer off
POSES["vent"]=svg(f'<rect x="18" y="176" width="204" height="62" rx="22" fill="{GREEN_D}"/>'
   + f'<g transform="translate(0 32)">{head("closed")}</g>' + orange(120,72,15,-4)
   + '<path d="M24 186 q24 -10 48 0 t48 0 t48 0 t48 0 v40 q0 6 -6 6 h-180 q-6 0 -6 -6z" fill="url(#bath)" opacity=".96"/>'
   + '<path d="M60 196 q10 -5 20 0 M152 200 q10 -5 20 0" stroke="#fff" stroke-width="2.4" fill="none" opacity=".7" stroke-linecap="round"/>'
   + ''.join(f'<path d="M{x} 70 q-6 -10 0 -20 q6 -10 0 -20" stroke="#BFE9D8" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>' for x in (44,196)),
   vb="0 20 240 230")

import pathlib
out=pathlib.Path('/home/claude/mascot'); 
for k,v in POSES.items(): (out/f'bara-{k}.svg').write_text(v)
labels={"hello":"Hi! (onboarding)","deadline":"2 days left…","oops":"Rejection: orange falls off","offer":"You got the offer!","vent":"Vent space: take your time"}
cards=''.join(f'<figure><div class="art">{POSES[k]}</div><figcaption>{labels[k]}</figcaption></figure>' for k in POSES)
(out/'sheet.html').write_text(f'''<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;background:radial-gradient(900px 500px at 85% -10%,#17594C,transparent 60%),linear-gradient(#0E3D35,#0A2D27);font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#EEF7F3;padding:36px 40px}}
h1{{margin:0 0 4px;font-size:34px;letter-spacing:-.02em}} p{{margin:0 0 26px;color:#B5D3CA}}
.grid{{display:grid;grid-template-columns:repeat(5,1fr);gap:18px}}
figure{{margin:0;background:#fff;border-radius:18px;padding:16px 10px 12px;text-align:center;box-shadow:0 20px 40px -18px rgba(0,0,0,.5)}}
.art svg{{width:100%;height:auto;max-height:210px}} figcaption{{color:#0D2924;font-weight:700;font-size:14px;margin-top:6px}}
</style></head><body><h1>Meet Bara 🧡</h1><p>The calmest career coach in Pakistan. Five moods, one orange.</p><div class="grid">{cards}</div></body></html>''')
print("ok")
