import json
import re
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')


# Read cameras.js
with open('js/cameras.js', 'r', encoding='utf-8') as f:
    cameras_content = f.read()

current_names = []
for line in cameras_content.split('\n'):
    match = re.search(r'name:\s*"([^"]+)"', line)
    if match:
        current_names.append(match.group(1))

print(f'Current cameras.js count: {len(current_names)}')

# Read check_cameras.html
with open('check_cameras.html', 'r', encoding='utf-8') as f:
    check_html = f.read()

overrides = []
in_overrides = False
for line in check_html.split('\n'):
    if 'const overrides = {' in line:
        in_overrides = True
        continue
    if in_overrides and '};' in line:
        in_overrides = False
        continue
    if in_overrides:
        match = re.search(r'"([^"]+)":\s*"([^"]+)"', line)
        if match:
            overrides.append(match.group(1))

print('\nOverrides NOT in current cameras.js:')
missing_overrides = [o for o in overrides if o not in current_names]
for m in missing_overrides:
    print(f'  - {m}')

# Check against valid_cameras_list.txt if exists
if os.path.exists('../.gemini/antigravity/brain/81eb75da-0ce1-4fb3-a686-5608c6cc9cae/scratch/valid_cameras_list.txt'):
    with open('../.gemini/antigravity/brain/81eb75da-0ce1-4fb3-a686-5608c6cc9cae/scratch/valid_cameras_list.txt', 'r', encoding='utf-8') as f:
        valid_lines = f.readlines()
    
    valid_names = []
    for line in valid_lines:
        match = re.search(r'- (.+)', line)
        if match:
            valid_names.append(match.group(1).strip())
    
    missing_from_valid = [v for v in valid_names if v not in current_names]
    print(f'\nCameras in valid_cameras_list.txt NOT in current cameras.js ({len(missing_from_valid)}):')
    for m in missing_from_valid:
        print(f'  - {m}')
else:
    print('\nvalid_cameras_list.txt not found')

