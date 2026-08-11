import re

with open('js/cameras.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 各カメラのブロックを取得
blocks = re.findall(r'\{\s*id:\s*"[^"]+".*?\},?', content, re.DOTALL)

miyagi_cams = []
for b in blocks:
    id_m = re.search(r'id:\s*"([^"]+)"', b)
    name_m = re.search(r'name:\s*"([^"]+)"', b)
    op_m = re.search(r'operator:\s*"([^"]+)"', b)
    img_m = re.search(r'imageUrl:\s*"([^"]+)"', b)
    src_m = re.search(r'sourceUrl:\s*"([^"]+)"', b)
    
    cid = id_m.group(1) if id_m else ""
    name = name_m.group(1) if name_m else ""
    op = op_m.group(1) if op_m else ""
    img = img_m.group(1) if img_m else ""
    src = src_m.group(1) if src_m else ""
    
    if '宮城県' in op or 'miyagi' in img.lower() or 'miyagi' in src.lower():
        miyagi_cams.append({
            "id": cid,
            "name": name,
            "operator": op,
            "imageUrl": img,
            "sourceUrl": src
        })

print(f"Total Miyagi cameras found: {len(miyagi_cams)}\n")
for c in miyagi_cams:
    print(f"ID: {c['id']} | 名称: {c['name']} | 管理者: {c['operator']}")
    print(f"  Image: {c['imageUrl']}")
    print(f"  Source: {c['sourceUrl']}\n")
