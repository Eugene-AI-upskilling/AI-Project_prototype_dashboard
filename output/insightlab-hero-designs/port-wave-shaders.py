from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
source = (root / 'web_effects/scroll_wave_field/ScrollWaveField.tsx').read_text(encoding='utf-8')
target = Path(__file__).with_name('wave-effect.js')
code = target.read_text(encoding='utf-8')
for name, marker in [('VERT', '__ORIGINAL_VERTEX__'), ('FRAG', '__ORIGINAL_FRAGMENT__')]:
    shader = re.search(r'const ' + name + r' = `([\s\S]*?)`', source).group(1)
    code = code.replace(marker, shader)
target.write_text(code, encoding='utf-8')
print('Original Originkit vertex and fragment shaders copied unchanged.')
