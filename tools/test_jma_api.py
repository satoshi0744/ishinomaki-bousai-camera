import urllib.request
import json

url = "https://www.jma.go.jp/bosai/warning/data/warning/040000.json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print("Data fetched successfully.")
        # 石巻市: 0420200, 東松島市: 0421100, 女川町: 0458100
        target_codes = {
            "0420200": "石巻市",
            "0421100": "東松島市",
            "0458100": "女川町"
        }
        
        # 構造を探索
        print(f"Top level keys: {list(data.keys()) if isinstance(data, dict) else len(data)}")
        if isinstance(data, list):
            for item in data:
                print("Item keys:", item.keys())
                area_code = item.get("areaCode", "")
                if area_code in target_codes:
                    print(f"Found target area: {target_codes[area_code]}")
                    print(json.dumps(item, ensure_ascii=False, indent=2)[:500])
        elif isinstance(data, dict):
            area_types = data.get("areaTypes", [])
            for at in area_types:
                areas = at.get("areas", [])
                for a in areas:
                    code = a.get("code", "")
                    if code in target_codes:
                        print(f"\n--- {target_codes[code]} ({code}) ---")
                        warnings = a.get("warnings", [])
                        active_warnings = [w for w in warnings if w.get("status") not in ["解約", "解除", "発表警報・注意報はなし"]]
                        print("Warnings:", active_warnings)
except Exception as e:
    print("Error:", e)
