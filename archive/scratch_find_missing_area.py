import json
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('js/official_cameras.js', 'r', encoding='utf-8') as f:
    content = f.read()
match = re.search(r'const OFFICIAL_CAMERA_DATA\s*=\s*(\[.*\]);', content, re.DOTALL)
if not match:
    sys.exit('Failed to parse official_cameras.js')
official_cameras = json.loads(match.group(1))

# Extract currently active cameras in cameras.js
with open('js/cameras.js', 'r', encoding='utf-8') as f:
    cam_content = f.read()

current_names = []
for line in cam_content.split('\n'):
    m = re.search(r'name:\s*"([^"]+)"', line)
    if m:
        current_names.append(m.group(1))

# Define keywords for Ishinomaki area and related rivers
keywords = ['石巻', '東松島', '女川', '登米', '北上川', '鳴瀬', '江合', '吉田川', '出来川', '迫川', '鞍坪', '釜谷', '皿貝', '三本木', '錦桜']

candidates = []
for cam in official_cameras:
    name = cam.get('name', '')
    lat = cam.get('lat', 0.0)
    lon = cam.get('lon', 0.0)
    
    # Check if it falls within the geographic bounding box of the area roughly
    in_bbox = (38.35 <= lat <= 38.75) and (140.90 <= lon <= 141.55)
    match_kw = any(kw in name for kw in keywords)
    
    if in_bbox or match_kw:
        # Check if it is already in cameras.js
        is_in_current = False
        for cur in current_names:
            if name in cur or cur in name or name.replace('川', '') in cur:
                is_in_current = True
                break
        
        if not is_in_current:
            candidates.append((name, lat, lon))

print(f'Found {len(candidates)} candidate cameras missing from index.html')
for c in candidates:
    print(f' - {c[0]} ({c[1]}, {c[2]})')
