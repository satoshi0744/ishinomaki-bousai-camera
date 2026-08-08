import json
import re
import math
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Haversine
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Load official
with open('js/official_cameras.js', 'r', encoding='utf-8') as f:
    c = f.read()
m = re.search(r'const OFFICIAL_CAMERA_DATA\s*=\s*(\[.*\]);', c, re.DOTALL)
official = json.loads(m.group(1))

# Load current
with open('js/cameras.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

current_cams = []
c_name = None
c_lat = None
c_lng = None
for line in lines:
    nm = re.search(r'name:\s*"([^"]+)"', line)
    ltm = re.search(r'lat:\s*([0-9\.]+)', line)
    lnm = re.search(r'lng:\s*([0-9\.]+)', line)
    if nm: c_name = nm.group(1)
    if ltm: c_lat = float(ltm.group(1))
    if lnm: c_lng = float(lnm.group(1))
    
    if c_name and c_lat and c_lng and '}' in line:
        current_cams.append({'name': c_name, 'lat': c_lat, 'lng': c_lng})
        c_name, c_lat, c_lng = None, None, None

overrides = {
    '旧北上川 日和大橋': '日和大橋その他',
    '旧北上川 真野川水門': '真野川水門左岸4.8km',
    '鳴瀬川 鳴瀬大橋': '鳴瀬大橋2.7ｋｍ',
    '北上川 福地水門': '福地水門',
    '北上川 釜谷水門': '釜谷水門右岸',
    '北上川 登米大橋': '登米大橋左岸54.2ｋｍ',
    '北上川 錦桜橋': '錦桜橋左岸44.0ｋｍ',
    '鳴瀬川 三本木': '三本木橋',
    '江合川 2.8KP左岸': '江合川2.8kＲ',
    '旧北上川 21.0KP左岸': '旧北上川21.0kＲ',
    '鳴瀬川 小野橋上流': '小野橋4.2ｋｍ',
    '北上川 下流7.4KP左岸': '北上川下流7.4kＲ',
    '北上川 下流10.8KP左岸': '北上川下流10.8kＲ',
    '皿貝川 長尾橋': '皿貝川'
}

count = 0
for cam in current_cams:
    kw = re.sub(r'北上川|迫川|江合川|鳴瀬川|吉田川|出来川|旧北上川|皿貝川|鞍坪川|釜谷川|三陸沿岸道路', '', cam['name']).strip()
    best_dist = float('inf')
    best_match = None
    
    if cam['name'] in overrides:
        for oc in official:
            if overrides[cam['name']] in oc['name']:
                best_match = oc
                best_dist = haversine(cam['lat'], cam['lng'], oc['lat'], oc['lon'])
                break
    else:
        for oc in official:
            if kw and (kw in oc['name'] or oc['name'] in kw):
                d = haversine(cam['lat'], cam['lng'], oc['lat'], oc['lon'])
                if d < best_dist:
                    best_dist = d
                    best_match = oc
                    
    if best_match:
        dist = int(best_dist)
        mark = "✅" if dist < 100 else "⚠️" if dist < 500 else "❌"
        print(f"{mark} {cam['name']} -> {best_match['name']} (ズレ: {dist}m)")
        count += 1
    else:
        print(f"NO MATCH: {cam['name']}")
        
print(f'\nTotal current cameras: {len(current_cams)}')
print(f'Matched: {count}')
