import fitz

pdf_path = r'C:\Users\skysa\.gemini\antigravity\brain\0a85c41c-9c01-4d16-afeb-3949c785fb01\.tempmediaStorage\0bba468c5fd74ca3.pdf'
doc = fitz.open(pdf_path)

full_text = []
for i, page in enumerate(doc):
    full_text.append(f"--- PAGE {i+1} ---")
    full_text.append(page.get_text())

with open('tools/midori_pdf_text.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(full_text))

print(f"Extracted {len(doc)} pages to midori_pdf_text.txt")
