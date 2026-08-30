import re

with open('src/components/layout/BottomNavigation.tsx', 'r') as f:
    content = f.read()

# Update the main wrapper for the Dynamic Island pill look
content = content.replace(
    'className="md:hidden fixed bottom-5 left-4 right-4 z-40 bg-white/95 backdrop-blur-lg border border-stone-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-3xl px-2 py-2 max-w-md mx-auto"',
    'className="md:hidden fixed bottom-6 left-6 right-6 z-40 bg-white/75 backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.5)] rounded-full px-2 py-2 max-w-[380px] mx-auto"'
)

# Replace icon container styles for active/inactive
content = re.sub(
    r'"w-8 h-8 rounded-xl flex items-center justify-center transition-all relative",\s*isItemActive\s*\?\s*"bg-\[#1a4d2e\] text-white shadow-xs"\s*:\s*"bg-stone-50 border border-stone-200/50 text-stone-600 hover:bg-emerald-50 hover:text-\[#1a4d2e\]"',
    '"w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative",\n                    isItemActive\n                      ? "bg-[#1a4d2e] text-white shadow-[0_8px_16px_rgba(26,77,46,0.3)] scale-110"\n                      : "bg-transparent text-stone-500 hover:bg-black/5 hover:text-stone-800"',
    content
)

content = re.sub(
    r'"w-8 h-8 rounded-xl flex items-center justify-center transition-all relative",\s*isActive\s*\?\s*"bg-\[#1a4d2e\] text-white shadow-xs"\s*:\s*item\.isSpecial\s*\?\s*item\.specialColorClass\s*:\s*"bg-transparent text-stone-500"',
    '"w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative",\n                          isActive\n                            ? "bg-[#1a4d2e] text-white shadow-[0_8px_16px_rgba(26,77,46,0.3)] scale-110"\n                            : item.isSpecial\n                            ? item.specialColorClass.replace("rounded-xl", "rounded-full")\n                            : "bg-transparent text-stone-500 hover:bg-black/5"',
    content
)

content = re.sub(
    r'className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative cursor-pointer active:scale-95"',
    'className="flex flex-col items-center justify-center py-1 px-2 rounded-full transition-all relative cursor-pointer active:scale-95 group"',
    content
)

content = re.sub(
    r'className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative active:scale-95"',
    'className="flex flex-col items-center justify-center py-1 px-2 rounded-full transition-all relative active:scale-95 group"',
    content
)

with open('src/components/layout/BottomNavigation.tsx', 'w') as f:
    f.write(content)
