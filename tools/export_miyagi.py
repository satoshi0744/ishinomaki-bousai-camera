import re

with open('js/cameras.js', 'r', encoding='utf-8') as f:
    content = f.read()

blocks = re.findall(r'\{\s*id:\s*"[^"]+".*?\},?', content, re.DOTALL)

miyagi_cams = []
for b in blocks:
    id_m = re.search(r'id:\s*"([^"]+)"', b)
    name_m = re.search(r'name:\s*"([^"]+)"', b)
    op_m = re.search(r'operator:\s*"([^"]+)"', b)
    
    cid = id_m.group(1) if id_m else ""
    name = name_m.group(1) if name_m else ""
    op = op_m.group(1) if op_m else ""
    
    if '宮城県' in op or '宮城県' in name:
        miyagi_cams.append(f"{cid} : {name} ({op})")

with open('tools/miyagi_result.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(miyagi_cams))

print("Saved to miyagi_result.txt")
