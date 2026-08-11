import requests
from bs4 import BeautifulSoup
import re

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.dobokusougou.pref.miyagi.jp/miyagi/'
}

# Gamen23Servlet の完全なHTMLソースを出力し、画像出力Servlet (OutputImageServlet) や <map> <area> タグを解析
url = "https://www.dobokusougou.pref.miyagi.jp/miyagi/servlet/Gamen23Servlet"
r = requests.get(url, headers=headers, timeout=10)

if r.status_code == 200:
    soup = BeautifulSoup(r.content, 'html.parser', from_encoding='Windows-31J')
    
    # 1. <map> <area> タグのチェック
    areas = soup.find_all('area')
    print(f"=== Found {len(areas)} <area> tags in Gamen23Servlet ===")
    for area in areas[:15]:
        print(f" Area alt={area.get('alt')} href={area.get('href')} onclick={area.get('onclick')}")

    # 2. OutputImageServlet 呼び出しのテスト
    # 水位/カメラ共通の画像出力サーブレット
    img_servlet_url = "https://www.dobokusougou.pref.miyagi.jp/miyagi/servlet/OutputImageServlet?param=bean=cameraImageDspBean?pos=0"
    try:
        r_img = requests.get(img_servlet_url, headers=headers, timeout=5)
        print(f"\n=== OutputImageServlet Test ===")
        print(f" Status: {r_img.status_code} | Content-Type: {r_img.headers.get('Content-Type')} | Length: {len(r_img.content)}")
    except Exception as e:
        print(f" OutputImageServlet error: {e}")

    # 3. 宮城県の他システムのカメラ画像サーバー (例: pref.miyagi.jp ドメイン内のカメラ画像保存場所) の直接調査
    # 各観測局コード例: 1025036 (皿貝川), 1025037 (北北上運河) など
    cam_ids = ["1025036", "1025037", "1025091", "1025116"]
    for cid in cam_ids:
        test_img_urls = [
            f"https://www.dobokusougou.pref.miyagi.jp/miyagi/camera/{cid}.jpg",
            f"https://www.dobokusougou.pref.miyagi.jp/miyagi/images/camera/{cid}.jpg",
            f"https://river.pref.miyagi.jp/camera/{cid}.jpg",
            f"https://www.pref.miyagi.jp/uploaded/image/{cid}.jpg"
        ]
        for t_url in test_img_urls:
            try:
                res = requests.get(t_url, headers=headers, timeout=2)
                if res.status_code == 200 and 'image' in res.headers.get('Content-Type', ''):
                    print(f" [SUCCESS] Camera Image Found! -> {t_url} ({len(res.content)} bytes)")
            except:
                pass
