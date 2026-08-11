import requests
import json

# official_cameras.js のカメラデータからいくつかピックアップしてURLパターンをテスト
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.dobokusougou.pref.miyagi.jp/'
}

# 1. 開発用tools内またはarchive内のカメラ生成スクリプト等で使われていた宮城県URLの検索
# 宮城県土木総合情報システムの代表的なカメラ画像サーブレット/HTMLエンドポイントパターン
url_patterns = [
    # パターンA: 宮城県土木総合情報システム Gamen22 / GamenCamera 関連
    "https://www.dobokusougou.pref.miyagi.jp/miyagi/servlet/Gamen22Servlet?param=common=dispDate:null$duration:60$timeNumber:24$pageGroup:%E6%9D%B1%E9%83%A8%E4%BB%99%E5%8F%B0$page:1$itemPageGroup:1H$itemPage:1$stationNo:1025036",
    # パターンB: 川の防災情報（国交省）が参照している宮城県等のデータ連携API/サーブレット
    "https://www.river.go.jp/kawabou/file/camera/1025036.jpg",
    "https://www.dobokusougou.pref.miyagi.jp/miyagi/camera/1025036.jpg",
    "https://www.dobokusougou.pref.miyagi.jp/miyagi/servlet/GamenCameraServlet?camId=1025036",
    "https://www.dobokusougou.pref.miyagi.jp/miyagi/camera_image/1025036.jpg"
]

print("=== 宮城県カメラ画像の直アクセス・代替パス実証テスト ===")
for url in url_patterns:
    try:
        r = requests.get(url, headers=headers, timeout=5)
        content_type = r.headers.get('Content-Type', '')
        print(f"URL: {url}")
        print(f"  Status: {r.status_code} | Type: {content_type} | Length: {len(r.content)} bytes")
        if r.status_code == 200:
            if 'image' in content_type:
                print("  --> ⭕ 画像データ取得成功！")
            elif 'html' in content_type:
                print("  --> 📄 HTMLページ取得成功（埋め込み用）")
    except Exception as e:
        print(f"URL: {url} -> Failed: {e}")
