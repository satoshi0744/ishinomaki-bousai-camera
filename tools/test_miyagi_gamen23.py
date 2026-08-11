import requests
from bs4 import BeautifulSoup
import re

url = "https://www.dobokusougou.pref.miyagi.jp/miyagi/servlet/Gamen23Servlet"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.dobokusougou.pref.miyagi.jp/miyagi/'
}

print("=== Gamen23Servlet ソース＆リンク解析 ===")
resp = requests.get(url, headers=headers, timeout=10)
print(f"Status: {resp.status_code}")

if resp.status_code == 200:
    soup = BeautifulSoup(resp.content, 'html.parser', from_encoding='Windows-31J')
    links = soup.find_all(['a', 'area', 'form', 'frame', 'iframe', 'img'])
    print(f"Total elements: {len(links)}")
    for el in links:
        href = el.get('href') or el.get('action') or el.get('src')
        text = el.get_text(strip=True) or el.get('alt', '')
        if href:
            print(f" Element <{el.name}>: [{text}] -> {href}")

    # script のテキスト全文から URL や Servlet パラメータを正規表現で抽出
    scripts = soup.find_all('script')
    for s in scripts:
        if s.string:
            matches = re.findall(r'Gamen\d+Servlet[^\'\"]*', s.string)
            if matches:
                print(f" Script Servlets found: {set(matches)}")
