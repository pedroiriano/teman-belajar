import re

filepath = 'apps/admin-web/src/app/dashboard/media/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'import { AdminIcon } from "@/components/admin-icon";',
    'import { AdminIcon } from "@/components/admin-icon";\nimport { AdminPagination } from "@/components/admin-pagination";'
)

# Using regex to find the old nav and replace it
nav_regex = re.compile(r'<nav className="mt-5 flex items-center justify-between" aria-label="Paginasi[^>]*>.*?</nav>', re.DOTALL)
content = nav_regex.sub(
    '<AdminPagination page={page} pages={pages} total={total} pageSize={20} pathname="/dashboard/media" query={{ q: query, kind }} />',
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Media patched")
