import json
import re

with open('js/cameras.js', 'r', encoding='utf-8') as f:
    text = f.read()

matches = re.findall(r'id:\s*[\'\"].*?[\'\"]', text)
print(f'Total cameras in cameras.js: {len(matches)}')
