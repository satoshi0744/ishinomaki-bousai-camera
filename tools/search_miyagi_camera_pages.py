import requests
from bs4 import BeautifulSoup
import urllib.parse

url = "https://www.dobokusougou.pref.miyagi.jp/miyagi/servlet/Gamen22Servlet?param=common=dispDate:null$duration:60$timeNumber:24$pageGroup:%E6%9D%B1%E9%83%A8%E4%BB%99%E5%8F%B0$page:1$itemPageGroup:1H$itemPage:1$stationNo:1025036"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.dobokusougou.pref.miyagi.jp/'
}

print("=== 宮城県土木総合情報システム カメラボタンリンク解析 ===")
resp = requests.get(url, headers=headers, timeout=10)

if resp.status_code == 200:
    soup = BeautifulSoup(resp.content, 'html.parser', from_encoding='Windows-31J')
    
    # camera_on.gif のリンクまたは onClick を探す
    camera_imgs = soup.find_all('img', src=lambda s: s and 'camera' in s)
    for img in camera_imgs:
        parent_a = img.find_parent('a')
        if parent_a:
            print(f"Camera Button Link: href={parent_a.get('href')}, onclick={parent_a.get('onclick')}")
        else:
            print(f"Camera Image without <a>: onclick={img.get('onclick')}")

    # ページ内の JavaScript (openWindow, openCamera, Gamen... 呼び出しなど) の抽出
    scripts = soup.find_all('script')
    print(f"\nFound {len(scripts)} script tags:")
    for s in scripts:
        if s.string and ('camera' in s.string.lower() or 'gamen' in s.string.lower() or 'window' in s.string.lower()):
            print("--- Script snippet ---")
            lines = s.string.split('\n')
            for line in lines:
                if any(k in line for k in ['camera', 'Camera', 'Gamen', 'open', 'location', 'submit']):
                    print(" ", line.strip())

    # フォームの送信先
    forms = soup.find_all('form')
    print(f"\nFound {len(forms)} forms:")
    for f in forms:
        print(f" Form action={f.get('action')}, name={f.get('name')}")
        for inp in f.find_all('input'):
            print(f"   Input name={inp.get('name')}, value={inp.get('value')}")
