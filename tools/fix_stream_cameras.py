import re
import json

# official_cameras.js からsys_id=2のカメラ(動画型)を全て抽出
with open('js/official_cameras.js', 'r', encoding='utf-8') as f:
    off_content = f.read()

start_idx = off_content.find('[')
end_idx = off_content.rfind(']') + 1
off_cams = json.loads(off_content[start_idx:end_idx])

# sys_id=2のカメラ（動画型）のリストを作る
stream_cams = {}
for c in off_cams:
    if c.get('sys_id') == 2:
        stream_cams[c['sys_cam_id']] = c

print(f"sys_id=2 cameras: {len(stream_cams)}")

# cameras.js を読み込んで、該当カメラの streamType と sourceUrl を修正
with open('js/cameras.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixes = 0
in_camera = False
current_sys_cam_id = None
current_line_sourceUrl = None

for i, line in enumerate(lines):
    # sourceUrl から sysCamId= を抽出
    src_m = re.search(r'sysCamId=(\d+)', line)
    if src_m and 'sourceUrl:' in line:
        current_sys_cam_id = src_m.group(1)
        current_line_sourceUrl = i
    
    # streamType: "static" で、直前のsourceUrlのカメラがsys_id=2なら修正
    if 'streamType: "static"' in line and current_sys_cam_id and current_sys_cam_id in stream_cams:
        cam = stream_cams[current_sys_cam_id]
        # streamType を stream に変更
        lines[i] = line.replace('"static"', '"stream"')
        
        # sourceUrl も直接映像画面URLに修正（scamIdはid値そのまま）
        if current_line_sourceUrl is not None:
            old_url_line = lines[current_line_sourceUrl]
            new_scam_id = str(cam['id'])  # 221034014 など
            new_url = f'https://www.river.go.jp/kawabou/pc/tm?zm=15&scamId={new_scam_id}&ownCd={cam["own_cd"]}&itmkndCd=100&sysCamId={cam["sys_cam_id"]}&fld=0&clat={cam["lat"]}&clon={cam["lon"]}'
            lines[current_line_sourceUrl] = re.sub(r'sourceUrl:\s*"[^"]+"', f'sourceUrl: "{new_url}"', old_url_line)
        
        fixes += 1
        print(f"Fixed: {cam.get('name', '')} (sysCamId={current_sys_cam_id}, id={cam['id']})")
        current_sys_cam_id = None
        current_line_sourceUrl = None

with open('js/cameras.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\nTotal fixes: {fixes}")
