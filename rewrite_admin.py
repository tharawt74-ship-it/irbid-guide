import re

with open('AdminDashboard.tsx.bak', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
stray_code = []

# Collect stray code
for i, line in enumerate(lines):
    if "TAB 2: BUSINESS REQUESTS" in line:
        skip = True
        continue
    if skip and "{activeTab === 'editSuggestions'" in line:
        skip = False
    
    if skip:
        stray_code.append(line)
    else:
        new_lines.append(line)

content = "".join(new_lines)

# Find where the incomplete requests block is
start_requests_block = content.find("{activeBusinessSubTab === 'requests' && (")
end_requests_block = content.find("{activeBusinessSubTab === 'upgrades' && (", start_requests_block)

full_requests_ui = """{activeBusinessSubTab === 'requests' && (
            <div className="space-y-6">
              {/* Filter and Search Bar */}
              <div className="bg-white p-4.5 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={requestSearch}
                    onChange={e => setRequestSearch(e.target.value)}
""" + "".join(stray_code) + """
          )}
"""

content = content[:start_requests_block] + full_requests_ui + content[end_requests_block:]

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
