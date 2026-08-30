import re
with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find("      {/* TAB 2: BUSINESS REQUESTS */}")
end = content.find("      {/* TAB: EDIT SUGGESTIONS */}")

content = content[:start] + content[end:]

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
