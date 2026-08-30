import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The original `businesses` block had:
#       )}
#       {/* TAB: EDIT SUGGESTIONS */}
# But because of my insertion, it might have an extra `)}`
# Let's check lines near `TAB: EDIT SUGGESTIONS`
idx = content.find("{/* TAB: EDIT SUGGESTIONS */}")
if idx != -1:
    surrounding = content[idx-50:idx+50]
    # print(surrounding)
    if "}\n          )}\n      {/* TAB: EDIT SUGGESTIONS */}" in surrounding:
        content = content.replace("}\n          )}\n      {/* TAB: EDIT SUGGESTIONS */}", "}\n      {/* TAB: EDIT SUGGESTIONS */}")
    elif "        </div>\n      )}\n          )}\n      {/* TAB: EDIT SUGGESTIONS */}" in surrounding:
        content = content.replace("        </div>\n      )}\n          )}\n      {/* TAB: EDIT SUGGESTIONS */}", "        </div>\n      )}\n      {/* TAB: EDIT SUGGESTIONS */}")

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
