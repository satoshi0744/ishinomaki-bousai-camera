import json
import re

# 1. official_cameras.js から sysCamId などを抽出してマッピングを作る
with open('js/official_cameras.js', 'r', encoding='utf-8') as f:
    off_content = f.read()

# official_cameras.js の中の { ... } を抽出
off_pattern = r'\{\s*sys_id:\s*(\d+),\s*own_cd:\s*"([^"]+)",.*?name:\s*"([^"]+)",.*?category_code:\s*"([^"]+)",.*?clat:\s*([\d\.]+),\s*clon:\s*([\d\.]+).*?\}'
off_matches = re.findall(off_pattern, off_content, re.DOTALL)

# clat, clon, name をキーにしてマッピング
off_dict = {}
for m in off_matches:
    sys_id, own_cd, name, cat_code, clat, clon = m
    # 多少の座標ズレを許容するため、nameでマッチさせるか、厳密な座標を使うか
    # 今回はname（完全一致しなくても部分一致できるか）または clat/clon でマッチさせる
    off_dict[name.replace(" ", "")] = {
        "sys_id": sys_id,
        "own_cd": own_cd,
        "clat": clat,
        "clon": clon
    }
    # 座標でもキーを作る（小数第3位まで）
    lat_key = f"{float(clat):.3f}"
    lon_key = f"{float(clon):.3f}"
    off_dict[f"{lat_key}_{lon_key}"] = {
        "sys_id": sys_id,
        "own_cd": own_cd,
        "clat": clat,
        "clon": clon
    }

# 2. cameras.js を読み込む
with open('js/cameras.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_camera = False
current_name = ""
current_lat = ""
current_lon = ""

for i, line in enumerate(lines):
    if '{' in line and 'id:' in lines[i+1] if i+1 < len(lines) else False:
        in_camera = True
    
    if in_camera:
        name_m = re.search(r'name:\s*"([^"]+)"', line)
        if name_m:
            current_name = name_m.group(1).replace(" ", "")
        
        lat_m = re.search(r'lat:\s*([\d\.]+)', line)
        if lat_m:
            current_lat = f"{float(lat_m.group(1)):.3f}"
            
        lon_m = re.search(r'lng:\s*([\d\.]+)', line)
        if lon_m:
            current_lon = f"{float(lon_m.group(1)):.3f}"

        # sourceUrl の書き換え判定
        if 'sourceUrl:' in line and 'twninfo' in line:
            # マッピングから探す
            match_data = None
            if current_name in off_dict:
                match_data = off_dict[current_name]
            elif f"{current_lat}_{current_lon}" in off_dict:
                match_data = off_dict[f"{current_lat}_{current_lon}"]
            
            if match_data:
                # ダイレクトURLを作成
                # scamId の生成ルール (1 + sys_id) または (2 + sys_id)
                # category_code は off_dict には含めていないが、適当に 121023024 などの形式に合わせる
                # 汎用的に: scamId = f"1{match_data['sys_id']}"
                sys_cam_id = match_data['sys_id']
                own_cd = match_data['own_cd']
                clat = match_data['clat']
                clon = match_data['clon']
                scam_id = f"1{sys_cam_id}" # 多くの場合は 1 + sys_id だが、2の場合もある。しかし大抵はsysCamIdが合っていれば飛べる
                
                new_url = f"https://www.river.go.jp/kawabou/pc/tm?zm=15&scamId={scam_id}&ownCd={own_cd}&itmkndCd=100&sysCamId={sys_cam_id}&fld=0&clat={clat}&clon={clon}"
                lines[i] = re.sub(r'sourceUrl:\s*"[^"]+"', f'sourceUrl: "{new_url}"', line)
                print(f"Replaced sourceUrl for {current_name}")

        # 空の imageUrl を探す
        if 'imageUrl:\s*""' in line or 'imageUrl: ""' in line:
            # プレースホルダーの static にする
            pass # ここでは処理を次行のstreamType等で行う
            
        # streamType の修正（空画像の場合は static にする）
        if 'streamType:\s*"stream"' in line or 'streamType: "stream"' in line:
            # 直前に imageUrl: "" があったら static にする
            # 少し前の行を遡って imageUrl: "" を探す
            for j in range(i-5, i):
                if j >= 0 and 'imageUrl: ""' in lines[j]:
                    lines[i] = re.sub(r'streamType:\s*"stream"', 'streamType: "static"', line)
                    print(f"Changed streamType to static for empty image camera: {current_name}")
                    break

with open('js/cameras.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done phase 2 repair")
