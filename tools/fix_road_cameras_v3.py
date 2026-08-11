import re

with open('js/cameras.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_road_camera = False
for i, line in enumerate(lines):
    if 'id: "road_' in line:
        in_road_camera = True
    
    if in_road_camera:
        # streamType の変更
        if 'streamType: "stream"' in line:
            lines[i] = line.replace('"stream"', '"static"')
        
        # imageUrl の情報から dr-xxxxx を取得
        img_m = re.search(r'imageUrl:\s*"https://www2\.thr\.mlit\.go\.jp/sendai/html/image/(DR-\d+)-l\.jpg"', line)
        if img_m:
            dr_id = img_m.group(1).lower()
            # 次の行またはその周辺にある sourceUrl を書き換える
            for j in range(i+1, min(i+10, len(lines))):
                if 'sourceUrl:' in lines[j]:
                    lines[j] = re.sub(r'sourceUrl:\s*"[^"]+"', f'sourceUrl: "https://www2.thr.mlit.go.jp/sendai/html/{dr_id}.html"', lines[j])
                    break
        
        # オブジェクトの終わり
        if '},' in line or '}' in line and not '{' in line:
            # 簡単なブロック終了判定。厳密ではないがここでは十分
            if line.strip() == '},' or line.strip() == '}':
                in_road_camera = False

with open('js/cameras.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
