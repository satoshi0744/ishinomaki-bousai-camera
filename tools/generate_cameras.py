#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
石巻管内 防災カメラデータ生成スクリプト

このスクリプトは、カメラの設置場所・URL等の情報を定義し、
フロントエンド用の cameras.js ファイルを自動生成します。

使い方:
  python tools/generate_cameras.py

出力先:
  js/cameras.js

カメラを追加・編集する場合:
  1. 下記の CAMERAS リストにカメラ情報を追加/編集
  2. このスクリプトを実行
  3. 生成された js/cameras.js をブラウザで確認
"""

import json
import os
from datetime import datetime

# カメラデータ定義
# 新しいカメラを追加する場合は、このリストに辞書を追加してください
CAMERAS = [
    # ========== 北上川系 ==========
    {
        "id": "river_001",
        "name": "北上川 飯野川橋",
        "category": "river",
        "lat": 38.5725,
        "lng": 141.2456,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "北上川水系 飯野川橋付近のカメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    {
        "id": "river_002",
        "name": "北上川 福地水門",
        "category": "river",
        "lat": 38.5891,
        "lng": 141.2701,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "北上川水系 福地水門付近のカメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    {
        "id": "river_003",
        "name": "北上川 新北上大橋",
        "category": "river",
        "lat": 38.5412,
        "lng": 141.3389,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "北上川水系 新北上大橋付近のカメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    {
        "id": "river_004",
        "name": "北上川 釜谷水門",
        "category": "river",
        "lat": 38.5150,
        "lng": 141.4012,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "北上川水系 釜谷水門付近のカメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    {
        "id": "river_005",
        "name": "北上川 下流7.4KP左岸",
        "category": "river",
        "lat": 38.5320,
        "lng": 141.3520,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "北上川 7.4キロポスト地点 左岸側カメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    {
        "id": "river_006",
        "name": "北上川 下流10.8KP左岸",
        "category": "river",
        "lat": 38.5580,
        "lng": 141.3150,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "北上川 10.8キロポスト地点 左岸側カメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    {
        "id": "river_007",
        "name": "北上川 月浜沢川樋門付近",
        "category": "river",
        "lat": 38.5690,
        "lng": 141.2850,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "北上川水系 月浜沢川樋門付近のカメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    {
        "id": "river_008",
        "name": "北上川 樫崎",
        "category": "river",
        "lat": 38.5450,
        "lng": 141.3280,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "北上川水系 樫崎地区のカメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    {
        "id": "river_009",
        "name": "北上川 橋浦",
        "category": "river",
        "lat": 38.5810,
        "lng": 141.2610,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "北上川水系 橋浦地区のカメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    {
        "id": "river_010",
        "name": "北上運河 中里新橋",
        "category": "river",
        "lat": 38.4380,
        "lng": 141.3420,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "北上運河 中里新橋付近のカメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    # ========== 旧北上川系 ==========
    {
        "id": "river_011",
        "name": "旧北上川 日和山公園",
        "category": "river",
        "lat": 38.4220,
        "lng": 141.3120,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "旧北上川 日和山公園付近のカメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    {
        "id": "river_012",
        "name": "旧北上川 住吉公園",
        "category": "river",
        "lat": 38.4350,
        "lng": 141.3050,
        "imageUrl": "",
        "sourceUrl": "https://www.river.go.jp/",
        "streamType": "static",
        "youtubeId": "",
        "description": "旧北上川 住吉公園付近のカメラ",
        "operator": "国土交通省 北上川下流河川事務所"
    },
    # ... 以下同様に全カメラを定義
    # （cameras.js と同じデータをPython辞書として管理）
]


def generate_cameras_js(cameras, output_path):
    """カメラデータからcameras.jsファイルを生成する"""

    # ヘッダーコメント
    header = f"""/**
 * 石巻管内 防災カメラデータ
 * 自動生成: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
 * 生成スクリプト: tools/generate_cameras.py
 *
 * file://プロトコル対応のため、JS変数として定義
 * カメラの追加・編集はこのファイルを直接編集するか、
 * tools/generate_cameras.py を使用して再生成してください。
 */
"""

    # データをJSON形式で整形（JavaScriptとして有効な形式）
    json_str = json.dumps(cameras, ensure_ascii=False, indent=2)

    # cameras.js の内容を構築
    content = f"{header}\nconst CAMERA_DATA = {json_str};\n"

    # ファイルに書き込み
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ cameras.js を生成しました: {output_path}")
    print(f"   カメラ数: {len(cameras)} 台")

    # カテゴリ別カウント
    categories = {}
    for cam in cameras:
        cat = cam.get("category", "other")
        categories[cat] = categories.get(cat, 0) + 1

    for cat, count in sorted(categories.items()):
        labels = {"river": "河川", "road": "道路", "coast": "海岸", "city": "市街地", "other": "その他"}
        print(f"   - {labels.get(cat, cat)}: {count} 台")


if __name__ == "__main__":
    # スクリプトのディレクトリを基準にパスを解決
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    output_path = os.path.join(project_dir, "js", "cameras.js")

    generate_cameras_js(CAMERAS, output_path)
    print(f"\n💡 ヒント: 全カメラを含めるには、CAMERAS リストに全データを追加してください。")
    print(f"   現在のデータは一部サンプルのみです。")
    print(f"   完全なデータは js/cameras.js を直接編集することもできます。")
