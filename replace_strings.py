import os
import re

replacements = {
    r'"Admin Console"': '"Panel Administrasi"',
    r'>Admin Console<': '>Panel Administrasi<',
    r"'Admin Console'": "'Panel Administrasi'",
    r'"Media Library"': '"Pustaka Media"',
    r'>Media Library<': '>Pustaka Media<',
    r"'Media Library'": "'Pustaka Media'",
    r'"Workspace"': '"Ruang Kerja"',
    r'>Workspace<': '>Ruang Kerja<',
    r"'Workspace'": "'Ruang Kerja'",
    r'"Taxonomy & SEO"': '"Taksonomi & SEO"',
    r'>Taxonomy & SEO<': '>Taksonomi & SEO<',
    r"'Taxonomy & SEO'": "'Taksonomi & SEO'",
    r'"Workflow editorial"': '"Alur Kerja Editorial"',
    r'>Workflow editorial<': '>Alur Kerja Editorial<',
    r"'Workflow editorial'": "'Alur Kerja Editorial'",
    r'"Dashboard editorial"': '"Dasbor editorial"',
    r'>Dashboard editorial<': '>Dasbor editorial<',
    r'"Dashboard"': '"Dasbor"',
    r'>Dashboard<': '>Dasbor<',
    r"'Dashboard'": "'Dasbor'",
    r'"Learning Experience"': '"Pengalaman Belajar"',
    r'>Learning Experience<': '>Pengalaman Belajar<',
    r"'Learning Experience'": "'Pengalaman Belajar'"
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    for pattern, replacement in replacements.items():
        # Prevent replacing in routes like /dashboard
        content = re.sub(r'(?<!/)' + pattern, replacement, content)
            
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

for root, dirs, files in os.walk('apps'):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.next', '.git']]
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

print("Done")
