import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the start of the `businesses` tab
businesses_tab_start = content.find("{activeTab === 'businesses' && (")

# I will find the rogue insertion which starts at `            </div>\n          )}\n          {activeBusinessSubTab === 'requests' && (`
rogue_start = content.find("            </div>\n          )}\n          {activeBusinessSubTab === 'requests' && (")

# I will find the end of the rogue insertion which is right before `                            <div>`
rogue_end = content.find("      )}\n                            <div>") + 8

# The rogue string is content[rogue_start:rogue_end]
rogue_string = content[rogue_start:rogue_end]

# I will remove the rogue string and replace it with `                              </div>\n                            )}`
content = content[:rogue_start] + "                              </div>\n                            )}\n" + content[rogue_end:]

# But wait, where should the rogue string actually go?
# The rogue string is the sub-tabs logic. I don't want it. I will just revert to the original `activeTab === 'businesses'` structure by removing the sub-tabs header I added.
# Let's find the header I added.
header_start = content.find("<div className=\"flex flex-col sm:flex-row bg-white rounded-2xl border border-[#e5e1da] p-1.5 shadow-xs sticky top-20 z-20\">")
header_end = content.find("{activeBusinessSubTab === 'directory' && (") + len("{activeBusinessSubTab === 'directory' && (")

if header_start != -1:
    content = content[:header_start] + content[header_end:]

# Now the `businesses` tab is back to its original state (mostly).
# I still need to fix the `requests` tab which is currently inside the rogue string!
# Wait, the `requests` tab was completely removed from the file and put inside the rogue string.
# I need to extract the `requests` tab from the rogue string and put it back where it belongs!

requests_tab_content = rogue_string[rogue_string.find("{activeBusinessSubTab === 'requests' && ("): rogue_string.find("{activeBusinessSubTab === 'upgrades' && (")]
requests_tab_content = requests_tab_content.replace("activeBusinessSubTab === 'requests'", "activeTab === 'requests'")
requests_tab_content = requests_tab_content.replace("            <div className=\"space-y-6\">", "        <div className=\"space-y-6\">")

# Now I'll put `requests_tab_content` right before `activeTab === 'businesses'`
content = content[:businesses_tab_start] + requests_tab_content + "\n" + content[businesses_tab_start:]

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Repaired!")
