import json
import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

with open('js/official_cameras.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract json part
match = re.search(r'const OFFICIAL_CAMERA_DATA\s*=\s*(\[.*\]);', content, re.DOTALL)
if match:
    official = json.loads(match.group(1))
else:
    print("Could not parse official_cameras.js")
    sys.exit(1)

targets = ['登米大橋', '錦桜橋', '三本木']
found = []
for c in official:
    for t in targets:
        if t in c['name']:
            found.append(c)

for f in found:
    print(f["name"], f["lat"], f["lon"], f.get("url", ""))

