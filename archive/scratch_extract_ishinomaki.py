import json
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('js/official_cameras.js', 'r', encoding='utf-8') as f:
    content = f.read()
match = re.search(r'const OFFICIAL_CAMERA_DATA\s*=\s*(\[.*\]);', content, re.DOTALL)
official_cameras = json.loads(match.group(1))

ishinomaki_keywords = ['北上川下流', '旧北上川', '鳴瀬川', '吉田川', '江合川', '出来川', '迫川', '鞍坪川', '釜谷川', '皿貝川', '真野川', '石巻', '東松島', '女川', '登米']
exclude_keywords = ['北上川上流', '岩手', '一関']

count = 0
for cam in official_cameras:
    name = cam['name']
    match_kw = any(kw in name for kw in ishinomaki_keywords)
    exclude = any(kw in name for kw in exclude_keywords)
    
    if match_kw and not exclude:
        print(f"- {name} ({cam.get('sys_cam_id', '')})")
        count += 1

print(f'\nTotal roughly matching: {count}')
