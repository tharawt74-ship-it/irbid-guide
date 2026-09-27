import re

with open('src/pages/BusinessMenuOffers.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Grid View buttons to respect isDirectOrderingDisabled
grid_block_pattern = r'\{item\.versions\s*&&\s*item\.versions\.length\s*>\s*0\s*\?\s*\(\s*<button.*?>.*?تخصيص الطلب.*?<\/button>\s*\)\s*:\s*\(\s*<button\s+type="button"\s+id=\{`add-btn-\$\{item\.id\}`\}\s+onClick=\{\(\)\s*=>\s*addToCart\(item\)\}.*?>.*?إضافة للسلة.*?<\/button>\s*\)\s*\}'

# Let's search and replace with:
grid_replacement = """{isDirectOrderingDisabled ? (
\t\t<span className="text-[10px] text-stone-400 font-bold bg-stone-100 border border-stone-200/60 px-3.5 py-2 rounded-xl">منيو للعرض فقط</span>
\t) : item.versions && item.versions.length > 0 ? (
\t\t<button
\t\t\ttype="button"
\t\t\tonClick={() => setSelectedItem(item)}
\t\t\tclassName="px-4 py-2 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border border-amber-100"
\t\t>
\t\t\t<span>تخصيص الطلب</span>
\t\t\t<ChevronLeft className="h-3.5 w-3.5" />
\t\t</button>
\t) : (
\t\t<button
\t\t\ttype="button"
\t\t\tid={`add-btn-${item.id}`}
\t\t\tonClick={() => addToCart(item)}
\t\t\tclassName="px-4 py-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border border-emerald-100"
\t\t>
\t\t\t<Plus className="h-3.5 w-3.5" />
\t\t\t<span>إضافة للسلة</span>
\t\t</button>
\t)}"""

content = re.sub(grid_block_pattern, grid_replacement, content, flags=re.DOTALL)

# 2. Update List View buttons to respect isDirectOrderingDisabled
list_block_pattern = r'\{item\.versions\s*&&\s*item\.versions\.length\s*>\s*0\s*\?\s*\(\s*<button.*?>.*?تخصيص الطلب.*?<\/button>\s*\)\s*:\s*\(\s*<button\s+type="button"\s+id=\{`add-btn-\$\{item\.id\}`\}\s+onClick=\{\(\)\s*=>\s*addToCart\(item\)\}.*?>.*?إضافة للسلة.*?<\/button>\s*\)\s*\}'

list_replacement = """{isDirectOrderingDisabled ? (
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

# Since Grid and List are both captured by the same pattern, re.sub will replace both correctly if we do it sequentially.
# Or let's use a simpler and cleaner direct replacement for the list view since they have slight differences (one has title="إضافة للسلة", different classes).

# Let's inspect list buttons block:
list_button_target = """\t{item.versions && item.versions.length > 0 ? (
\t<button
\ttype="button"
\tonClick={() => setSelectedItem(item)}
\tclassName="p-2.5 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white rounded-2xl transition-all cursor-pointer border border-amber-100 shadow-3xs"
\ttitle="تخصيص الطلب"
\t>
\t<ChevronLeft className="h-4 w-4" />
\t</button>
\t) : (
\t<button
\ttype="button"
\tid={`add-btn-${item.id}`}
\tonClick={() => addToCart(item)}
\tclassName="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-2xl transition-all cursor-pointer border border-emerald-100 shadow-3xs"
\ttitle="إضافة للسلة"
\t>
\t<Plus className="h-4 w-4" />
\t</button>
\t)}"""

if list_button_target in content:
    content = content.replace(list_button_target, list_replacement)
    print("Patched List View buttons!")
else:
    # Try with raw string (replacing whitespaces with wildcards)
    print("List button target exact match failed. Retrying regex.")
    escaped_list = list_button_target.replace('[', '\\[').replace(']', '\\]').replace('(', '\\(').replace(')', '\\)').replace('$', '\\$').replace('`', '\\`').replace('?', '\\?').replace('*', '\\*')
    # Replace any leading spaces with regex
    p = re.compile(r'\s*\{\s*item\.versions\s*&&\s*item\.versions\.length\s*>\s*0\s*\?.*?title="إضافة للسلة".*?<\/button>\s*\}\s*\}', re.DOTALL)
    content, count = p.subn(list_replacement, content)
    print("Regex List Button replaced count:", count)

# 3. Floating Bottom Tab Bar Grid Columns
tab_bar_class = 'className="w-full pointer-events-auto bg-white/95 backdrop-blur-md rounded-full border border-stone-200/80 shadow-[0_16px_40px_rgba(0,0,0,0.18)] p-2 grid grid-cols-3 gap-2 relative z-10"'
tab_bar_replacement = 'className={`w-full pointer-events-auto bg-white/95 backdrop-blur-md rounded-full border border-stone-200/80 shadow-[0_16px_40px_rgba(0,0,0,0.18)] p-2 grid gap-2 relative z-10 ${isDirectOrderingDisabled ? \'grid-cols-2\' : \'grid-cols-3\'}`}'

if tab_bar_class in content:
    content = content.replace(tab_bar_class, tab_bar_replacement)
    print("Patched tab bar grid columns!")
else:
    print("Tab bar exact match failed. Trying regex.")
    p = re.compile(r'p-2\s+grid\s+grid-cols-3\s+gap-2\s+relative\s+z-10', re.DOTALL)
    content, count = p.subn(r'p-2 grid gap-2 relative z-10 ${isDirectOrderingDisabled ? \'grid-cols-2\' : \'grid-cols-3\'}', content)
    print("Regex Tab Bar columns replaced:", count)

# 4. Conditional Shopping Cart tab (Tab 3)
cart_tab_start = '{"{/* Tab 3: Integrated Shopping Cart (Left Side) */}"}'
# In the actual file it is:
# \t{/* Tab 3: Integrated Shopping Cart (Left Side) */}
# \t<button
# \ttype="button"
# ...
# \t</button>
# Let's wrap the button of Tab 3 inside `{!isDirectOrderingDisabled && (` and `)}`

# Let's locate Tab 3 button block
cart_tab_pattern = r'\t\{/\*\s*Tab 3:\s*Integrated Shopping Cart.*?<\/button>'
cart_replacement = """\t{!isDirectOrderingDisabled && (
\t\t<button
\t\t\ttype="button"
\t\t\tonClick={() => {
\t\t\t\tsetActiveTab('cart');
\t\t\t\twindow.scrollTo({ top: 0, behavior: 'smooth' });
\t\t\t}}
\t\t\tclassName="py-3.5 px-3 rounded-full text-center text-xs sm:text-sm font-black relative transition-all flex items-center justify-center gap-2 cursor-pointer"
\t\t>
\t\t\t{activeTab === 'cart' && (
\t\t\t\t<motion.div
\t\t\t\t\tlayoutId="activePillTab"
\t\t\t\t\tclassName="absolute inset-0 bg-emerald-500 rounded-full -z-10"
\t\t\t\t\ttransition={{ type: 'spring', stiffness: 380, damping: 32 }}
\t\t\t\t/>
\t\t\t)}
\t\t\t<div className="relative">
\t\t\t\t<ShoppingCart className={`h-4.5 w-4.5 transition-colors duration-200 ${activeTab === 'cart' ? 'text-white' : totalItems > 0 ? 'text-emerald-600 animate-bounce' : 'text-stone-400'}`} />
\t\t\t\t{totalItems > 0 && (
\t\t\t\t\t<span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full text-[8px] h-4 w-4 flex items-center justify-center font-black animate-pulse">
\t\t\t\t\t\t{totalItems}
\t\t\t\t\t</span>
\t\t\t\t)}
\t\t\t</div>
\t\t\t<div className="flex flex-col items-start leading-none text-right">
\t\t\t\t<span className={`transition-colors duration-200 ${activeTab === 'cart' ? 'text-white' : 'text-stone-600'}`}>السلة</span>
\t\t\t\t{totalItems > 0 && (
\t\t\t\t\t<span className={`text-[8.5px] font-black leading-none mt-0.5 transition-colors duration-200 ${activeTab === 'cart' ? 'text-white/90' : 'text-emerald-600'}`}>
\t\t\t\t\t\t{totalPrice.toFixed(2)} د.أ
\t\t\t\t\t</span>
\t\t\t\t)}
\t\t\t</div>
\t\t</button>
\t)}"""

content = re.sub(cart_tab_pattern, cart_replacement, content, flags=re.DOTALL)
print("Patched bottom tab buttons conditionally!")

with open('src/pages/BusinessMenuOffers.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished progress 2!")
