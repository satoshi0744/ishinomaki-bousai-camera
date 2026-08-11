import requests
from bs4 import BeautifulSoup
import urllib.parse

url = "https://www.dobokusougou.pref.miyagi.jp/miyagi/servlet/Gamen22Servlet?param=common=dispDate:null$duration:60$timeNumber:24$pageGroup:%E6%9D%B1%E9%83%A8%E4%BB%99%E5%8F%B0$page:1$itemPageGroup:1H$itemPage:1$stationNo:1025036"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.dobokusougou.pref.miyagi.jp/'
}

print("=== 宮城県 Gamen22Servlet 内の画像URL抽出テスト ===")
resp = requests.get(url, headers=headers, timeout=10)
print(f"Status: {resp.status_code}")

if resp.status_code == 200:
    soup = BeautifulSoup(resp.content, 'html.parser', from_encoding='Windows-31J')
    imgs = soup.find_all('img')
    print(f"Total img tags found: {len(imgs)}")
    for i, img in enumerate(imgs):
        src = img.get('src')
        alt = img.get('alt', '')
        full_url = urllib.parse.urljoin(url, src)
        print(f" [{i}] src: {src} -> full: {full_url}")

    # iframeやembedやform、JavaScript変数の抽出
    iframes = soup.find_all('iframe')
    print(f"\nTotal iframe tags found: {len(iframes)}")
    for iframe in iframes:
        print(f" iframe src: {iframe.get('src')}")
