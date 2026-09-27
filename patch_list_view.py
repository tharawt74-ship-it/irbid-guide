import re

with open('src/pages/BusinessMenuOffers.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search using a regex that is spacing-independent
pattern = r'\{\s*item\.versions\s*&&\s*item\.versions\.length\s*>\s*0\s*\?.*?title="تخصيص الطلب".*?<\/button>.*?<\/button>\s*\}'

match = re.search(pattern, content, re.DOTALL)
if match:
    print("Found list buttons with regex!")
    # Let's see what it contains
    print(match.group(0)[:150])
    
    # Let's replace it
    replacement = """{isDirectOrderingDisabled ? (
\t\t<span className="text-[10px] text-stone-400 font-semibold bg-stone-50 border border-stone-100 px-2.5 py-1 rounded-md shrink-0">للعرض فقط</span>
\t) : item.versions && item.versions.length > 0 ? (
\t\t<button
\t\t\ttype="button"
\t\t\tonClick={() => setSelectedItem(item)}
\t\t\tclassName="p-2.5 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white rounded-2xl transition-all cursor-pointer border border-amber-100 shadow-3xs"
\t\t\ttitle="تخصيص الطلب"
\t\t>
\t\t\t<ChevronLeft className="h-4 w-4" />
\t\t</button>
\t) : (
\t\t<button
\t\t\ttype="button"
\t\t\tid={`add-btn-${item.id}`}
\t\t\tonClick={() => addToCart(item)}
\t\t\tclassName="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-2xl transition-all cursor-pointer border border-emerald-100 shadow-3xs"
\t\t\ttitle="إضافة للسلة"
\t\t>
\t\t\t<Plus className="h-4 w-4" />
\t\t</button>
\t)}"""
    
    content = content.replace(match.group(0), replacement)
    with open('src/pages/BusinessMenuOffers.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched list buttons!")
else:
    print("Could not find list buttons with regex")
