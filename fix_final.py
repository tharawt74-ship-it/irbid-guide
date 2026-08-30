import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. We need to extract the floating table content from line 1922 to 2180 (before TAB 4: MARKETING CAMPAIGNS)
floating_start = content.find("                            <div>\n                              <div className=\"flex items-center gap-1.5\">")
floating_end = content.find("      {/* TAB 4: MARKETING CAMPAIGNS */}")

floating_content = content[floating_start:floating_end]

# 2. We need to find the `businesses` tab header which was inserted.
businesses_header_start = content.find("{activeTab === 'businesses' && (")
businesses_header_end = content.find("                                🏬") + len("                                🏬")

header_content = content[businesses_header_start:businesses_header_end]

# 3. We need to find the requests and upgrades sub-tabs which were wrongly inserted right after 🏬.
wrong_insertion_start = content.find("            </div>\n          )}\n          {activeBusinessSubTab === 'requests' && (")
wrong_insertion_end = content.find("        </div>\n      )}\n                            <div>")

wrong_insertion = content[wrong_insertion_start:wrong_insertion_end]

# 4. Now let's assemble the correct `directory` sub-tab.
# It should contain:
# 1. The start of the businesses tab, up to 🏬
# 2. The closing tags for 🏬: `\n                              </div>\n                            )}`
# 3. The floating content (the rest of the table)
# BUT wait! `header_content` currently contains the `activeBusinessSubTab === 'directory'` wrapper!
# Let's clean it up. We will remove the sub-tabs logic entirely from `AdminDashboard.tsx` to get back to a working state, OR implement it correctly.
# Let's just implement it correctly!

new_businesses_block = """      {activeTab === 'businesses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row bg-white rounded-2xl border border-[#e5e1da] p-1.5 shadow-xs sticky top-20 z-20">
            <button
              onClick={() => setActiveBusinessSubTab('directory')}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeBusinessSubTab === 'directory' ? 'bg-[#1a4d2e] text-white shadow-md' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}
            >
              دليل المحلات
            </button>
            <button
              onClick={() => setActiveBusinessSubTab('requests')}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${activeBusinessSubTab === 'requests' ? 'bg-[#1a4d2e] text-white shadow-md' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}
            >
              طلبات إضافة المحلات
              {pendingRequestsCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingRequestsCount}</span>
              )}
            </button>
            <button
              onClick={() => setActiveBusinessSubTab('upgrades')}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${activeBusinessSubTab === 'upgrades' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md' : 'text-amber-700 hover:bg-amber-50 hover:text-amber-800'}`}
            >
              <Crown className="h-4 w-4" />
              طلبات الترقية VIP
            </button>
          </div>

          {activeBusinessSubTab === 'directory' && (
"""

# The toolbar and table header is inside `header_content` starting from `{/* Toolbar */}`
toolbar_start = header_content.find("            <div className=\"space-y-6\">\n              {/* Toolbar */}")
toolbar_content = header_content[toolbar_start:]

# Let's fix the missing tags in toolbar_content:
toolbar_content = toolbar_content + """
                              </div>
                            )}
"""

# Then append the floating content
directory_tab = toolbar_content + floating_content

# Then append the other sub-tabs
requests_tab = wrong_insertion.replace("            </div>\n          )}\n          {activeBusinessSubTab === 'requests' && (", "          {activeBusinessSubTab === 'requests' && (")

# Put it all together
final_businesses_tab = new_businesses_block + directory_tab + requests_tab + """
        </div>
      )}
"""

# Replace the whole mess in the original file
content = content[:businesses_header_start] + final_businesses_tab + "\n      {/* TAB 4: MARKETING CAMPAIGNS */}" + content[floating_end + len("      {/* TAB 4: MARKETING CAMPAIGNS */}"):]

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
