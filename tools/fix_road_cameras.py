import re
import os

# 1. app.js の修正
app_js_path = 'js/app.js'
with open(app_js_path, 'r', encoding='utf-8') as f:
    app_content = f.read()

# isTypeB の判定から road を削除
app_content = app_content.replace(
    "const isTypeB = camera.streamType === 'youtube' || camera.streamType === 'stream' || category === 'road' || !camera.imageUrl;",
    "const isTypeB = camera.streamType === 'youtube' || camera.streamType === 'stream' || !camera.imageUrl;"
)

app_content = app_content.replace(
    "else if (camera.streamType === 'stream' || camera.streamType === 'youtube' || camera.category === 'road') {",
    "else if (camera.streamType === 'stream' || camera.streamType === 'youtube') {"
)

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(app_content)

# 2. cameras.js の修正
cameras_js_path = 'js/cameras.js'
with open(cameras_js_path, 'r', encoding='utf-8') as f:
    cam_content = f.read()

# 道路カメラのブロックを見つけて置換する関数
def process_road_camera(match):
    block = match.group(0)
    # streamType の変更
    block = re.sub(r'streamType:\s*"stream"', 'streamType: "static"', block)
    
    # imageUrl から DR-XXXXX を抽出して sourceUrl を作成
    img_match = re.search(r'imageUrl:\s*"https://www2\.thr\.mlit\.go\.jp/sendai/html/image/(DR-\d+)-l\.jpg"', block)
    if img_match:
        dr_id = img_match.group(1).lower() # DR-74161 -> dr-74161
        new_source_url = f'https://www2.thr.mlit.go.jp/sendai/html/{dr_id}.html'
        block = re.sub(r'sourceUrl:\s*"[^"]+"', f'sourceUrl: "{new_source_url}"', block)
    
    return block

# category: "road" が含まれるブロックを置換 (正規表現の工夫が必要なので、安全のために行単位で処理するか、IDプレフィックス road_ で探す)
# より確実に、road_001 等を持つオブジェクトブロックを一括置換する
cam_content = re.sub(r'\{\s*id:\s*"road_\d+".*?operator:\s*"国土交通省 仙台河川国道事務所"\s*\}', process_road_camera, cam_content, flags=re.DOTALL)

with open(cameras_js_path, 'w', encoding='utf-8') as f:
    f.write(cam_content)

print("Replacement complete.")
