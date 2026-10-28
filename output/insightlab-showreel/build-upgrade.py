"""Build the Pinterest-inspired upgrade without changing Claude's original."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parent
source = (root / 'reel.html').read_text(encoding='utf-8')
original_hash = hashlib.sha256((root / 'EugeneInsightLab_Showreel_15s.mp4').read_bytes()).hexdigest()

def replace(old, new):
    global source
    if old not in source:
        raise ValueError('Source anchor not found: ' + old[:90])
    source = source.replace(old, new, 1)

replace('<title>Insight Lab Showreel</title>', '<title>Eugene Insight Lab · Claude Showreel Upgrade</title>')
replace("ink: '#05060a', ink2: '#0d1017'", "ink: '#090608', ink2: '#160b10'")
replace("blue: '#1b74e4', bluePt: '#4dabf7', navy: '#0b2e6b'", "blue: '#d21f23', bluePt: '#f28c91', navy: '#57151d'")
replace("paper: '#f4f6f9', tint: '#eaf0f6'", "paper: '#f8f5f3', tint: '#f6e9e9'")
replace("txt: '움직인다.', bg: C.blue", "txt: '움직인다.', bg: C.redDeep")
replace("rgba(77,171,247,.28)", "rgba(210,31,35,.26)")
replace("rgba(77,171,247,0)", "rgba(210,31,35,0)")
replace("ctx.strokeStyle = '#bfe2ff'", "ctx.strokeStyle = '#ffe5e6'")
replace("i === 0 ? C.blue : '#eef3fb'", "i === 0 ? C.red : '#f7e9e9'")
replace("i < 20 ? C.blue : '#cfd8e6'", "i < 20 ? C.red : '#e7d8d9'")
replace("const pal = [C.up, C.down, C.red, C.bluePt, '#ffffff'];", "const pal = [C.redHi, '#8c1825', C.red, '#ed9297', '#ffffff'];")
replace("300, 160, 30, C.down", "300, 160, 30, C.navy")
replace("178, 178, 22, C.down", "178, 178, 22, C.redDeep")
replace("out.globalAlpha = .07;", "out.globalAlpha = .032;")
replace("rgba(0,0,0,.28)", "rgba(0,0,0,.18)")

effects = r'''
/* RedSun-inspired tracked lighting. Deterministic camera movement for export. */
function halo(x, y, radius, strength = .23, light = false) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(235,55,65,${strength})`);
  g.addColorStop(.38, `rgba(210,31,35,${strength * .45})`);
  g.addColorStop(1, 'rgba(210,31,35,0)');
  ctx.globalCompositeOperation = light ? 'source-over' : 'screen';
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function orbitField(t, amount = 1) {
  ctx.save(); ctx.translate(CX, CY + 30);
  ctx.rotate(-.25 + t * .025); ctx.scale(1, .58);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(0, 0, 250 + i * 140, -.35 + t * .12 + i, 3.2 + t * .12 + i);
    ctx.lineWidth = i === 0 ? 2 : 1;
    ctx.strokeStyle = `rgba(240,135,143,${(.14 - i * .025) * amount})`; ctx.stroke();
  }
  ctx.restore();
}
function surfaceField(t) {
  halo(1260 + Math.sin(t * .8) * 240, 475, 820, .085, true);
  ctx.save(); ctx.strokeStyle = 'rgba(110,35,43,.045)'; ctx.lineWidth = 1;
  for (let i = -10; i < 12; i++) {
    ctx.beginPath(); ctx.moveTo(CX + i * 24, 120); ctx.lineTo(CX + i * 230, H); ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const y = 160 + Math.pow(i / 6, 2) * 910;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
}
'''
replace('/* ───────── S1 · drop & impact', effects + '\n/* ───────── S1 · drop & impact')
replace("function s1(t) {\n  bg(C.ink);", "function s1(t) {\n  bg(C.ink);\n  halo(CX + Math.sin(t * 1.8) * 190, CY, 700, .19);\n  orbitField(t, prog(t, .25, .8));")
replace('    // giant ghost index', "    halo(CX + Math.sin(t * 2) * 480, CY - 100, 850, light ? .05 : .13, light);\n    // giant ghost index")
replace("function s3(t) {\n  bg(C.ink);", "function s3(t) {\n  bg(C.ink);\n  halo(1450, 220, 820, .12);")
replace("  // grid\n  ctx.lineWidth", "  // Soft red tracking light stays behind the plotted information.\n  halo(head[0], head[1], 370, .15 * f);\n  // grid\n  ctx.lineWidth")
replace("  ctx.fillStyle = 'rgba(11,46,107,.07)';", "  surfaceField(t);\n  ctx.fillStyle = 'rgba(92,33,41,.045)';")
replace("    const x = cd.x + cd.from[0] * (1 - sp), y = cd.y + cd.from[1] * (1 - sp);", "    const floatIn = E.outCubic(prog(t, 7.15, 7.6));\n    const depth = cd.k === 'report' ? 1 : cd.k === 'bt' ? .45 : .75;\n    const drift = Math.sin((t - 7.25) * 1.55 + k * 1.1) * 7 * floatIn * depth;\n    const x = cd.x + cd.from[0] * (1 - sp) + Math.cos(t * .9 + k) * 2 * floatIn;\n    const y = cd.y + cd.from[1] * (1 - sp) + drift;")
replace("ctx.rotate(cd.r * (1 - sp)); ctx.scale", "ctx.rotate(cd.r * (1 - sp) + Math.sin(t * .75 + k) * .0035 * floatIn); ctx.scale")
replace("ctx.shadowColor = 'rgba(11,30,70,.14)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;", "ctx.shadowColor = 'rgba(63,14,23,.15)'; ctx.shadowBlur = 38 + depth * 12; ctx.shadowOffsetY = 16 + depth * 8 + drift * .3;")
replace("    cardBody(cd, e - .22, t);", "    cardBody(cd, e - .22, t);\n    // A thin moving rim catches the light without washing out card text.\n    ctx.save();\n    const edge = ctx.createLinearGradient(0, 0, cd.w, cd.h);\n    edge.addColorStop(0, 'rgba(210,31,35,.26)'); edge.addColorStop(.48, 'rgba(210,31,35,.02)');\n    edge.addColorStop(1, 'rgba(210,31,35,.13)');\n    ctx.strokeStyle = edge; ctx.lineWidth = 2; rrect(ctx, 1, 1, cd.w - 2, cd.h - 2, 25); ctx.stroke();\n    const sweep = prog(t, 7.26 + k * .05, 8.14 + k * .04);\n    if (sweep > 0 && sweep < 1) {\n      const lx = lerp(-200, cd.w + 200, sweep);\n      const gleam = ctx.createLinearGradient(lx - 130, 0, lx + 130, 0);\n      gleam.addColorStop(0, 'rgba(255,255,255,0)'); gleam.addColorStop(.5, 'rgba(255,255,255,.17)');\n      gleam.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gleam; ctx.fillRect(0, 0, cd.w, cd.h);\n    }\n    ctx.restore();")
replace("function s5(t) {\n  bg(C.ink);", "function s5(t) {\n  bg(C.ink);\n  halo(CX + Math.sin(t) * 340, CY, 950, .14);\n  orbitField(t, .55);")
replace("  ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, iris, 0, 7); ctx.clip(); bg('#ffffff');", "  ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, iris, 0, 7); ctx.clip(); bg('#ffffff');\n  halo(CX + 540, CY - 310, 900, .04, true);")

# The original values are illustration data. Make the master usable as a website
# brand film without implying that its depicted index levels are current quotes.
replace("textSpaced(ctx, 'EUGENE INSIGHT LAB — SHOWREEL 2026'", "textSpaced(ctx, 'EUGENE INSIGHT LAB — SHOWREEL 2026'")
replace("  ctx.fillRect(64, H - 66, (W - 128) * (t / DUR), 2);", "  if (t >= 4 && t < 11) {\n    ctx.font = F(500, 16); ctx.textAlign = 'right';\n    ctx.fillText('ILLUSTRATIVE DATA · 연출용 데이터', W - 64, H - 72);\n  }\n  ctx.fillRect(64, H - 66, (W - 128) * (t / DUR), 2);")
(root / 'reel-upgraded.html').write_text(source, encoding='utf-8')
(root / 'upgrade-source.json').write_text(json.dumps({
    'basis': 'Claude original reel.html',
    'originalVideo': 'EugeneInsightLab_Showreel_15s.mp4',
    'originalSha256': original_hash,
    'source': 'reel-upgraded.html',
    'durationSeconds': 15,
    'changes': ['Eugene red palette', 'tracked red halo', 'floating product surfaces', 'moving rim light', 'orbital depth', 'cleaner grain'],
    'deployed': False,
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('Built reel-upgraded.html. Claude original source and MP4 are unchanged.')
