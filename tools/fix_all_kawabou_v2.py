import json
import re
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

with open('js/official_cameras.js', 'r', encoding='utf-8') as f:
    off_content = f.read()

off_pattern = r'\{\s*sys_id:\s*(\d+),\s*own_cd:\s*"([^"]+)",.*?name:\s*"([^"]+)",.*?category_code:\s*"([^"]+)",.*?clat:\s*([\d\.]+),\s*clon:\s*([\d\.]+).*?\}'
off_matches = re.findall(off_pattern, off_content, re.DOTALL)

off_cams = []
for m in off_matches:
    sys_id, own_cd, name, cat_code, clat, clon = m
    off_cams.append({
        "sys_id": sys_id,
        "own_cd": own_cd,
        "name": name,
        "clat": float(clat),
        "clon": float(clon)
    })

with open('js/cameras.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_camera = False
current_lat = 0.0
current_lon = 0.0
count_replaced = 0

for i, line in enumerate(lines):
    if '{' in line and 'id:' in lines[i+1] if i+1 < len(lines) else False:
        in_camera = True
    
    if in_camera:
        lat_m = re.search(r'lat:\s*([\d\.]+)', line)
        if lat_m:
            current_lat = float(lat_m.group(1))
            
        lon_m = re.search(r'lng:\s*([\d\.]+)', line)
        if lon_m:
            current_lon = float(lon_m.group(1))

        if 'sourceUrl:' in line and 'twninfo' in line:
            # 最も近い official camera を探す
            best_cam = None
            best_dist = 9999
            for c in off_cams:
                dist = haversine(current_lat, current_lon, c["clat"], c["clon"])
                if dist < best_dist:
                    best_dist = dist
                    best_cam = c
            
            if best_cam and best_dist < 1.0: # 1km以内なら同一とみなす
                sys_cam_id = best_cam['sys_id']
                own_cd = best_cam['own_cd']
                clat = best_cam['clat']
                clon = best_cam['clon']
                scam_id = f"1{sys_cam_id}"
                
                new_url = f"https://www.river.go.jp/kawabou/pc/tm?zm=15&scamId={scam_id}&ownCd={own_cd}&itmkndCd=100&sysCamId={sys_cam_id}&fld=0&clat={clat}&clon={clon}"
                lines[i] = re.sub(r'sourceUrl:\s*"[^"]+"', f'sourceUrl: "{new_url}"', line)
                count_replaced += 1
                
        if '},' in line or ('}' in line and not '{' in line):
            in_camera = False

with open('js/cameras.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Replaced {count_replaced} twninfo URLs.")
