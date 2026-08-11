import json
import re

with open('js/cameras.js', 'r', encoding='utf-8') as f:
    content = f.read()

# JSON風のオブジェクトを大まかにパース
# id, name, category, imageUrl, sourceUrl, streamType を抽出
pattern = r'\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",.*?category:\s*"([^"]+)",.*?imageUrl:\s*"([^"]*)",\s*sourceUrl:\s*"([^"]*)",\s*streamType:\s*"([^"]*)".*?\}'

matches = re.findall(pattern, content, re.DOTALL)

print(f"Total cameras parsed: {len(matches)}")

empty_image_cameras = []
portal_url_cameras = []

for m in matches:
    cid, name, category, image_url, source_url, stream_type = m
    
    if image_url == "":
        empty_image_cameras.append((cid, name, category, source_url, stream_type))
    
    # URLに twninfo が含まれている（＝ダイレクトリンクになっていない川の防災情報のポータル）
    if "twninfo" in source_url:
        portal_url_cameras.append((cid, name, category, image_url, stream_type))

print("\n--- Cameras with empty imageUrl ---")
for c in empty_image_cameras:
    print(c)

print(f"\n--- Cameras with portal sourceUrl (twninfo): {len(portal_url_cameras)} ---")
for c in portal_url_cameras[:10]:
    print(c)
if len(portal_url_cameras) > 10:
    print("... and more")
