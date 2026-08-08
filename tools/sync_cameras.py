import json
import urllib.request
import urllib.error
import ssl
import re
import os
import datetime

# SSL証明書エラーを無視
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 設定
BOUNDING_BOX = {
    "min_lat": 38.25,
    "max_lat": 38.65,
    "min_lng": 141.15,
    "max_lng": 141.65
}
JS_FILE = r"D:\workplace\ishinomaki_bousai_camera\js\cameras.js"
REPORT_FILE = r"D:\workplace\ishinomaki_bousai_camera\tools\sync_report.md"

# 仮のAPIエンドポイント（川の防災情報オープンデータや自治体提供JSON等を想定）
# ※ 実際の運用に合わせて国交省の提供する公式JSON URLに変更してください。
OFFICIAL_API_URL = "https://www.river.go.jp/api/v1/cameras.json"

def get_current_cameras():
    """現在の cameras.js から登録済みカメラのリストを取得"""
    with open(JS_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    blocks = re.findall(r'\{\s*id:\s*"(.*?)",\s*name:\s*"(.*?)",', content, flags=re.DOTALL)
    current_names = [name for _, name in blocks]
    return current_names

def fetch_official_cameras():
    """公式APIから管内の最新カメラ一覧を取得（モック実装）"""
    print("公式の観測所一覧（オープンデータ）へアクセスしています...")
    # ※ 本来は urllib.request.urlopen(OFFICIAL_API_URL) 等でJSONを取得します。
    # 今回は仕組みの提供として、ダミーで差分検知をシミュレートする処理を記述します。
    # 運用開始時に、適切な提供元のGeoJSON/JSON仕様に合わせてパース処理を実装してください。
    
    # モック：取得できたと仮定した最新の管内カメラ（現在登録済みのリスト＋仮想の新規カメラ）
    current = get_current_cameras()
    
    # テスト用：仮想的に1台追加、1台削除があったことにする
    fetched = current.copy()
    if "北上川 飯野川橋" in fetched:
        fetched.remove("北上川 飯野川橋") # 廃止シミュレート
    fetched.append("北上川 追波湾河口") # 新規シミュレート
    
    return fetched

def generate_report():
    print(f"[{datetime.datetime.now()}] カメラ同期チェックを開始します。")
    current_cameras = set(get_current_cameras())
    official_cameras = set(fetch_official_cameras())
    
    new_cameras = official_cameras - current_cameras
    removed_cameras = current_cameras - official_cameras
    
    report_lines = [
        f"# 防災カメラ 同期レポート",
        f"生成日時: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "## 新規検知カメラ（追加候補）",
    ]
    
    if new_cameras:
        for cam in new_cameras:
            report_lines.append(f"- [新規] {cam}")
    else:
        report_lines.append("- なし")
        
    report_lines.append("")
    report_lines.append("## 廃止検知カメラ（削除候補）")
    
    if removed_cameras:
        for cam in removed_cameras:
            report_lines.append(f"- [廃止] {cam}")
    else:
        report_lines.append("- なし")
        
    report_lines.append("\n※ このレポートは公式オープンデータとの差分検知結果です。")
    report_lines.append("※ 差分がある場合は `cameras.js` への反映（追加・削除）をご検討ください。")
    
    os.makedirs(os.path.dirname(REPORT_FILE), exist_ok=True)
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))
        
    print(f"同期チェックが完了しました。レポート: {REPORT_FILE}")
    if new_cameras or removed_cameras:
        print("⚠️ 差分が検知されました！レポートを確認してください。")

if __name__ == "__main__":
    generate_report()
