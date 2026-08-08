import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('js/cameras.js', 'r', encoding='utf-8') as f:
    cameras_content = f.read()

keywords = ['鳴瀬大橋', '登米', '錦桜', '三本木']
for k in keywords:
    print(f'"{k}" in cameras.js: {k in cameras_content}')
