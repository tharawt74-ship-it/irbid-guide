import re

with open('src/components/layout/Layout.tsx', 'r') as f:
    content = f.read()

# Replace the motion.div class and remove the mobile header
pattern = r'(<motion\.div\s+initial=\{\{\s*opacity:\s*0,\s*y:\s*15\s*\}\}\s+animate=\{\{\s*opacity:\s*1,\s*y:\s*0\s*\}\}\s+exit=\{\{\s*opacity:\s*0,\s*y:\s*15\s*\}\}\s+transition=\{\{.*?\}\}\s+onTouchStart=\{handleTouchStart\}\s+onTouchEnd=\{handleTouchEnd\}\s+className=)"lg:hidden fixed inset-0 z-50 bg-\[#faf9f6\] flex flex-col h-screen max-h-screen overflow-hidden"(\s+dir="rtl"\s*>)\s*\{\/\*\s*Full-Page Mobile Header\s*\*\/\}\s*<div.*?<\/div>\s*\{\/\*\s*Scrollable Content Wrapper\s*\*\/\}'

replacement = r'\1"lg:hidden fixed top-[64px] inset-x-0 bottom-0 z-40 bg-[#faf9f6] flex flex-col overflow-hidden"\2\n            {/* Scrollable Content Wrapper */}'

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/components/layout/Layout.tsx', 'w') as f:
    f.write(new_content)
