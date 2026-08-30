import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract the content of activeTab === 'requests'
requests_pattern = re.compile(r"\{\s*activeTab === 'requests' && \(\s*(.*?)\s*\)\s*\}", re.DOTALL)
requests_match = requests_pattern.search(content)
if not requests_match:
    print("Could not find requests tab")
    exit(1)

requests_content = requests_match.group(1)

# 2. Extract the content of activeTab === 'businesses'
businesses_pattern = re.compile(r"\{\s*activeTab === 'businesses' && \(\s*<div className=\"space-y-6\">\s*(.*?)\s*</div>\s*\)\s*\}", re.DOTALL)
businesses_match = businesses_pattern.search(content)
if not businesses_match:
    print("Could not find businesses tab")
    exit(1)

businesses_content = businesses_match.group(1)

# 3. Create the new combined businesses tab
new_businesses_tab = f"""{{activeTab === 'businesses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row bg-white rounded-2xl border border-[#e5e1da] p-1.5 shadow-xs sticky top-20 z-20">
            <button
              onClick={{() => setActiveBusinessSubTab('directory')}}
              className={{`flex-1 py-3 text-sm font-black rounded-xl transition-all ${{activeBusinessSubTab === 'directory' ? 'bg-[#1a4d2e] text-white shadow-md' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}}`}}
            >
              دليل المحلات
            </button>
            <button
              onClick={{() => setActiveBusinessSubTab('requests')}}
              className={{`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${{activeBusinessSubTab === 'requests' ? 'bg-[#1a4d2e] text-white shadow-md' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}}`}}
            >
              طلبات إضافة المحلات
              {{pendingRequestsCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{{pendingRequestsCount}}</span>
              )}}
            </button>
            <button
              onClick={{() => setActiveBusinessSubTab('upgrades')}}
              className={{`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${{activeBusinessSubTab === 'upgrades' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md' : 'text-amber-700 hover:bg-amber-50 hover:text-amber-800'}}`}}
            >
              <Crown className="h-4 w-4" />
              طلبات الترقية VIP
            </button>
          </div>

          {{activeBusinessSubTab === 'directory' && (
            <div className="space-y-6">
              {businesses_content}
            </div>
          )}}

          {{activeBusinessSubTab === 'requests' && (
            <div className="space-y-6">
              {requests_content.removeprefix('<div className="space-y-6">').removesuffix('</div>').strip()}
            </div>
          )}}

          {{activeBusinessSubTab === 'upgrades' && (
            <div className="bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs space-y-4">
              <h2 className="text-xl font-black text-[#2d2a26] flex items-center gap-2">
                <Crown className="h-6 w-6 text-amber-500" />
                طلبات الترقية للباقة الذهبية
              </h2>
              <UpgradeRequestsManager showToast={{showToast}} />
            </div>
          )}}
        </div>
      )}}"""

# 4. Remove requests block
content = content[:requests_match.start()] + content[requests_match.end():]

# 5. Replace businesses block
content = re.sub(r"\{\s*activeTab === 'businesses' && \(\s*<div className=\"space-y-6\">\s*.*?\s*</div>\s*\)\s*\}", new_businesses_tab.replace('\\', '\\\\'), content, flags=re.DOTALL)

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done replacing tabs.")
