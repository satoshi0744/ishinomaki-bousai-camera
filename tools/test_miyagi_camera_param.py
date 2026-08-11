import requests
from bs4 import BeautifulSoup
import re

# Gamen23Servlet に Ishinomaki (石巻) エリアパラメータを付与してテスト
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.dobokusougou.pref.miyagi.jp/miyagi/'
}

# 1. Gamen23Servlet 内の JS コードから param の組み立て方法を解析
url = "https://www.dobokusougou.pref.miyagi.jp/miyagi/servlet/Gamen23Servlet"
r = requests.get(url, headers=headers, timeout=10)

if r.status_code == 200:
    print("=== Gamen23Servlet の JavaScript ソース全体解析 ===")
    soup = BeautifulSoup(r.content, 'html.parser', from_encoding='Windows-31J')
    scripts = soup.find_all('script')
    for i, s in enumerate(scripts):
        if s.string and len(s.string) > 50:
            print(f"--- Script [{i}] ---")
            for line in s.string.split('\n'):
                if any(kw in line for kw in ['param', 'Servlet', 'common', 'station', 'camera', 'disp', 'pageGroup']):
                    print("  ", line.strip())

# 2. 宮城県の石巻エリアカメラパラメータテスト
# Gamen22Servlet と同様の param 構造で Gamen23Servlet をテスト
test_param_url = "https://www.dobokusougou.pref.miyagi.jp/miyagi/servlet/Gamen23Servlet?param=common=dispDate:null$duration:60$timeNumber:24$pageGroup:%E7%9F%B3%E5%B7%BB$page:1$itemPageGroup:1H$itemPage:1$stationNo:1025036"
r_param = requests.get(test_param_url, headers=headers, timeout=10)
print(f"\nTest Param URL Status: {r_param.status_code}, Length: {len(r_param.content)}")

if r_param.status_code == 200:
    soup_p = BeautifulSoup(r_param.content, 'html.parser', from_encoding='Windows-31J')
    imgs_p = soup_p.find_all('img')
    print(f"Images in Param URL: {len(imgs_p)}")
    for img in imgs_p:
        src = img.get('src', '')
        if 'OutputImage' in src or 'camera' in src.lower() or 'jpg' in src.lower() or 'png' in src.lower():
            print("  Image src:", src)
