import requests
import re
import json
from bs4 import BeautifulSoup

# 宮城県 土木総合情報システム のトップおよび河川・道路・防災カメラ情報の調査
base_url = "https://www.dobokusougou.pref.miyagi.jp/miyagi/"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.dobokusougou.pref.miyagi.jp/'
}

print("=== 1. 宮城県 土木総合情報システム トップページの調査 ===")
try:
    resp = requests.get(base_url, headers=headers, timeout=10)
    print(f"Top Page Status: {resp.status_code}")
    if resp.status_code == 200:
        soup = BeautifulSoup(resp.content, 'html.parser')
        links = soup.find_all('a', href=True)
        print("Found links on top page:")
        for link in links:
            href = link['href']
            text = link.get_text(strip=True)
            if any(k in text or k in href for k in ['camera', 'Camera', 'カメラ', 'Gamen', 'gamen', 'live', 'Live']):
                print(f"  - [{text}] -> {href}")
except Exception as e:
    print(f"Error accessing top page: {e}")

print("\n=== 2. Gamen サーブレットやカメラ関連サーブレットの探索 ===")
# 既存の water_level_stations で使われている Gamen22Servlet の周辺や Gamen 系の調査
# 以前の調査や一般的な Servlet 番号のパターン (Gamen1Servlet, Gamen2Servlet ... Gamen21Servlet, Gamen23Servlet 等)
test_servlets = [
    "servlet/Gamen1Servlet",
    "servlet/Gamen2Servlet",
    "servlet/Gamen21Servlet",
    "servlet/Gamen22Servlet",
    "servlet/Gamen23Servlet",
    "servlet/Gamen24Servlet",
    "servlet/Gamen25Servlet",
    "servlet/Gamen26Servlet",
    "servlet/Gamen27Servlet",
    "servlet/Gamen30Servlet",
    "servlet/GamenCameraServlet",
    "servlet/CameraServlet"
]

for s in test_servlets:
    url = base_url + s
    try:
        r = requests.get(url, headers=headers, timeout=5)
        print(f"Servlet {s}: Status {r.status_code}, Length {len(r.content)}")
        if r.status_code == 200 and ("カメラ" in r.text or "camera" in r.text.lower() or "img" in r.text.lower()):
            soup = BeautifulSoup(r.content, 'html.parser')
            title = soup.title.string if soup.title else "No Title"
            print(f"   --> Title: {title}")
            # 画像タグやリンク抽出
            imgs = soup.find_all('img')
            print(f"   --> Img count: {len(imgs)}")
            for img in imgs[:5]:
                print(f"       img src: {img.get('src')}")
    except Exception as e:
        print(f"Servlet {s} failed: {e}")
