import re

with open('js/cameras.js', 'r', encoding='utf-8') as f:
    content = f.read()

def repl(m):
    block = m.group(0)
    # streamType の書き換え
    block = re.sub(r'streamType:\s*"stream"', 'streamType: "static"', block)
    
    # URLの生成と書き換え
    img_m = re.search(r'imageUrl:\s*"https://www2\.thr\.mlit\.go\.jp/sendai/html/image/(DR-\d+)-l\.jpg"', block)
    if img_m:
        new_url = f'https://www2.thr.mlit.go.jp/sendai/html/{img_m.group(1).lower()}.html'
        block = re.sub(r'sourceUrl:\s*"[^"]+"', f'sourceUrl: "{new_url}"', block)
    return block

# road_ から始まり、次のオブジェクトまでの間を対象にする
new_content = re.sub(r'\{\s*id:\s*"road_\d+".*?(?=\n\s*\}|\n\s*,\s*\{)', repl, content, flags=re.DOTALL)

with open('js/cameras.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done")
