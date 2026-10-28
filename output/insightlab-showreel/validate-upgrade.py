"""Verify encoded deliverables and preservation of the preferred original."""
from pathlib import Path
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parent
receipt = json.loads((root / 'upgrade-source.json').read_text(encoding='utf-8'))

def inspect(name):
    file = root / name
    probe = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(file)
    ], encoding='utf-8'))
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(file), '-f', 'null', '-'], check=True)
    return {'filename': name, 'bytes': file.stat().st_size, 'probe': probe, 'decodedWithoutErrors': True}

full = inspect('EugeneInsightLab_Showreel_15s_Upgraded.mp4')
loop = inspect('EugeneInsightLab_Hero_Upgraded.mp4')
v = next(s for s in full['probe']['streams'] if s['codec_type'] == 'video')
a = next(s for s in full['probe']['streams'] if s['codec_type'] == 'audio')
lv = next(s for s in loop['probe']['streams'] if s['codec_type'] == 'video')
assert (v['width'], v['height'], v['r_frame_rate'], int(v['nb_frames'])) == (1920, 1080, '60/1', 900)
assert (a['codec_name'], int(a['sample_rate']), a['channels']) == ('aac', 48000, 2)
assert abs(float(full['probe']['format']['duration']) - 15) < .02
assert (lv['width'], lv['height'], lv['r_frame_rate'], int(lv['nb_frames'])) == (1280, 720, '30/1', 450)
assert len(loop['probe']['streams']) == 1
assert abs(float(loop['probe']['format']['duration']) - 15) < .02
original_hash = hashlib.sha256((root / receipt['originalVideo']).read_bytes()).hexdigest()
assert original_hash == receipt['originalSha256'], 'Original changed'
result = {'passed': True, 'deployed': False, 'originalPreserved': True, 'originalSha256': original_hash,
          'fullVideo': full, 'heroLoop': loop, 'posterBytes': (root / 'poster-upgraded.jpg').stat().st_size,
          'galleryUrl': 'http://127.0.0.1:4183/claude-showreel/',
          'heroUrl': 'http://127.0.0.1:4183/hero-options/showreel-claude-upgraded.html'}
(root / 'upgrade-validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'passed': True, 'originalPreserved': True, 'fullBytes': full['bytes'], 'heroBytes': loop['bytes'], 'duration': 15}))
