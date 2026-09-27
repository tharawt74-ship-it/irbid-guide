with open('src/pages/BusinessMenuOffers.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's locate the first block (Grid View Button Block)
# The grid view block goes from:
# item.versions && item.versions.length > 0 ? (
# ... to the end of </button> )}

grid_start_phrase = "item.versions && item.versions.length > 0 ? (\n\t\t<button\n\t\t\ttype=\"button\"\n\t\t\tonClick={() => setSelectedItem(item)}"
# Wait, let's look at the exact match of the first block in content:
# "800 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border border-amber-100\"		>			<span>تخصيص الطلب</span>			<ChevronLeft className="h-3.5 w-3.5" />		</button>	) : (		<button			type=\"button\"\t\t\tid={`add-btn-${item.id}`}\t\t\tonClick={() => addToCart(item)}\t\t\tclassName=\"px-4 py-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border border-emerald-10"

# Let's find index of `id={`add-btn-${item.id}`}` for Match 1
idx1 = content.find("id={`add-btn-${item.id}`}")
print("Found Match 1 at:", idx1)

# Let's find index of `id={`add-btn-${item.id}`}` for Match 2 (start searching after Match 1)
idx2 = content.find("id={`add-btn-${item.id}`}", idx1 + 100)
print("Found Match 2 at:", idx2)

# Let's find where the outer `{` starts before idx1
# In Grid view:
# `{item.versions && item.versions.length > 0 ? ( ... ) : ( ... )}`
start_idx1 = content.rfind("{item.versions && item.versions.length > 0 ?", 0, idx1)
end_idx1 = content.find(")}", idx1) + 2

# Let's replace the first block!
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

print("First Block Start:", start_idx1, "End:", end_idx1)
content_replaced = content[:start_idx1] + grid_replacement + content[end_idx1:]

# Now, because of the replacement, we must recalculate idx2!
# Let's find idx2 again in content_replaced
idx2_new = content_replaced.find("id={`add-btn-${item.id}`}", start_idx1 + len(grid_replacement))
print("New Match 2 position:", idx2_new)

start_idx2 = content_replaced.rfind("{item.versions && item.versions.length > 0 ?", 0, idx2_new)
end_idx2 = content_replaced.find(")}", idx2_new) + 2

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

print("Second Block Start:", start_idx2, "End:", end_idx2)
content_final = content_replaced[:start_idx2] + list_replacement + content_replaced[end_idx2:]

with open('src/pages/BusinessMenuOffers.tsx', 'w', encoding='utf-8') as f:
    f.write(content_final)

print("Successfully patched both Add To Cart blocks!")
