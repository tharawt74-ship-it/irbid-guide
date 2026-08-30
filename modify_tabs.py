import re

with open('tabs_original.txt', 'r') as f:
    content = f.read()

# Replace the wrapper
new_wrapper = """            <div className="relative bg-stone-50/50 border-b border-[#e5e1da]">
              {/* Mobile Edge Fade Gradients */}
              <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-stone-50/90 to-transparent z-10 pointer-events-none md:hidden" />
              <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-stone-50/90 to-transparent z-10 pointer-events-none md:hidden" />
              
              <div className="flex overflow-x-auto gap-3 md:gap-8 scrollbar-hide px-4 sm:px-8 py-3 md:py-0 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>"""

content = content.replace(
    """            <div className="border-b border-[#e5e1da] px-4 sm:px-8 flex overflow-x-auto gap-4 sm:gap-8 scrollbar-hide bg-stone-50/50" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>""",
    new_wrapper
)

# Add closing div at the end
content = content.replace("            </div>\n          </div>", "            </div>\n            </div>\n          </div>")

# Replace about tab
content = content.replace(
    """className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'about' 
                    ? 'border-[#1a4d2e] text-[#1a4d2e]' 
                    : 'border-transparent text-stone-500 hover:text-[#2d2a26]'
                }`}""",
    """className={`whitespace-nowrap transition-all flex items-center gap-1.5 snap-start font-bold text-sm md:text-base px-4 py-2 md:px-0 md:py-4 rounded-full md:rounded-none border md:border-0 md:border-b-2 ${
                  activeTab === 'about' 
                    ? 'bg-[#1a4d2e]/10 border-[#1a4d2e]/20 text-[#1a4d2e] md:bg-transparent md:border-b-[#1a4d2e]' 
                    : 'bg-white border-stone-200/60 text-stone-600 shadow-xs md:bg-transparent md:border-b-transparent md:text-stone-500 md:shadow-none hover:text-[#2d2a26]'
                }`}"""
)

# Replace menu tab
content = content.replace(
    """className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === 'menu' || activeTab === 'products'
                      ? 'border-[#1a4d2e] text-[#1a4d2e]' 
                      : 'border-transparent text-stone-500 hover:text-[#2d2a26]'
                  }`}""",
    """className={`whitespace-nowrap transition-all flex items-center gap-1.5 snap-start font-bold text-sm md:text-base px-4 py-2 md:px-0 md:py-4 rounded-full md:rounded-none border md:border-0 md:border-b-2 ${
                    activeTab === 'menu' || activeTab === 'products'
                      ? 'bg-[#1a4d2e]/10 border-[#1a4d2e]/20 text-[#1a4d2e] md:bg-transparent md:border-b-[#1a4d2e]' 
                      : 'bg-white border-stone-200/60 text-stone-600 shadow-xs md:bg-transparent md:border-b-transparent md:text-stone-500 md:shadow-none hover:text-[#2d2a26]'
                  }`}"""
)

# Replace specs tab
content = content.replace(
    """className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === 'specs' 
                      ? 'border-[#1a4d2e] text-[#1a4d2e]' 
                      : 'border-transparent text-stone-500 hover:text-[#2d2a26]'
                  }`}""",
    """className={`whitespace-nowrap transition-all flex items-center gap-1.5 snap-start font-bold text-sm md:text-base px-4 py-2 md:px-0 md:py-4 rounded-full md:rounded-none border md:border-0 md:border-b-2 ${
                    activeTab === 'specs' 
                      ? 'bg-[#1a4d2e]/10 border-[#1a4d2e]/20 text-[#1a4d2e] md:bg-transparent md:border-b-[#1a4d2e]' 
                      : 'bg-white border-stone-200/60 text-stone-600 shadow-xs md:bg-transparent md:border-b-transparent md:text-stone-500 md:shadow-none hover:text-[#2d2a26]'
                  }`}"""
)

# Replace offers tab
content = content.replace(
    """className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === 'offers' 
                      ? 'border-red-500 text-red-600' 
                      : 'border-transparent text-stone-500 hover:text-red-600'
                  }`}""",
    """className={`whitespace-nowrap transition-all flex items-center gap-1.5 snap-start font-bold text-sm md:text-base px-4 py-2 md:px-0 md:py-4 rounded-full md:rounded-none border md:border-0 md:border-b-2 ${
                    activeTab === 'offers' 
                      ? 'bg-red-50 border-red-200 text-red-600 md:bg-transparent md:border-b-red-500' 
                      : 'bg-white border-stone-200/60 text-stone-600 shadow-xs md:bg-transparent md:border-b-transparent md:text-stone-500 md:shadow-none hover:text-red-600'
                  }`}"""
)

# Replace jobs tab
content = content.replace(
    """className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'jobs' 
                    ? 'border-[#1a4d2e] text-[#1a4d2e]' 
                    : 'border-transparent text-stone-500 hover:text-[#2d2a26]'
                }`}""",
    """className={`whitespace-nowrap transition-all flex items-center gap-1.5 snap-start font-bold text-sm md:text-base px-4 py-2 md:px-0 md:py-4 rounded-full md:rounded-none border md:border-0 md:border-b-2 ${
                  activeTab === 'jobs' 
                    ? 'bg-[#1a4d2e]/10 border-[#1a4d2e]/20 text-[#1a4d2e] md:bg-transparent md:border-b-[#1a4d2e]' 
                    : 'bg-white border-stone-200/60 text-stone-600 shadow-xs md:bg-transparent md:border-b-transparent md:text-stone-500 md:shadow-none hover:text-[#2d2a26]'
                }`}"""
)

# Replace reels tab
content = content.replace(
    """className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === 'reels' 
                      ? 'border-purple-600 text-purple-700 font-black' 
                      : 'border-transparent text-stone-500 hover:text-purple-600'
                  }`}""",
    """className={`whitespace-nowrap transition-all flex items-center gap-1.5 snap-start font-bold text-sm md:text-base px-4 py-2 md:px-0 md:py-4 rounded-full md:rounded-none border md:border-0 md:border-b-2 ${
                    activeTab === 'reels' 
                      ? 'bg-purple-50 border-purple-200 text-purple-700 font-black md:bg-transparent md:border-b-purple-600' 
                      : 'bg-white border-stone-200/60 text-stone-600 shadow-xs md:bg-transparent md:border-b-transparent md:text-stone-500 md:shadow-none hover:text-purple-600'
                  }`}"""
)

# Replace gallery tab
content = content.replace(
    """className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === 'gallery' 
                      ? 'border-emerald-600 text-emerald-700 font-black' 
                      : 'border-transparent text-stone-500 hover:text-emerald-600'
                  }`}""",
    """className={`whitespace-nowrap transition-all flex items-center gap-1.5 snap-start font-bold text-sm md:text-base px-4 py-2 md:px-0 md:py-4 rounded-full md:rounded-none border md:border-0 md:border-b-2 ${
                    activeTab === 'gallery' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-black md:bg-transparent md:border-b-emerald-600' 
                      : 'bg-white border-stone-200/60 text-stone-600 shadow-xs md:bg-transparent md:border-b-transparent md:text-stone-500 md:shadow-none hover:text-emerald-600'
                  }`}"""
)

# Replace analytics tab
content = content.replace(
    """className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      activeTab === 'analytics' 
                        ? 'border-amber-500 text-amber-700 font-black' 
                        : 'border-transparent text-amber-600 hover:text-amber-800 font-bold'
                    }`}""",
    """className={`whitespace-nowrap transition-all flex items-center gap-1.5 snap-start font-bold text-sm md:text-base px-4 py-2 md:px-0 md:py-4 rounded-full md:rounded-none border md:border-0 md:border-b-2 ${
                      activeTab === 'analytics' 
                        ? 'bg-amber-50 border-amber-200 text-amber-700 font-black md:bg-transparent md:border-b-amber-500' 
                        : 'bg-white border-stone-200/60 text-stone-600 shadow-xs md:bg-transparent md:border-b-transparent md:text-amber-600 md:shadow-none hover:text-amber-800'
                    }`}"""
)

# Replace upgrade VIP button
content = content.replace(
    """className="py-3.5 sm:py-4 font-black text-sm sm:text-base text-amber-700 hover:text-amber-800 transition-colors flex items-center gap-1.5 border-b-2 border-transparent cursor-pointer" """,
    """className="whitespace-nowrap transition-all flex items-center gap-1.5 snap-start font-black text-sm md:text-base px-4 py-2 md:px-0 md:py-4 rounded-full md:rounded-none border md:border-0 md:border-b-2 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-700 shadow-xs md:bg-transparent md:border-b-transparent md:text-amber-700 md:shadow-none hover:text-amber-800 cursor-pointer" """
)
# Note: actually the upgrade button original class doesn't have the space at the end in the original string, let's just do a regex replace to be safe.
# Actually I'll do a simple replace
content = content.replace(
    """className="py-3.5 sm:py-4 font-black text-sm sm:text-base text-amber-700 hover:text-amber-800 transition-colors flex items-center gap-1.5 border-b-2 border-transparent cursor-pointer" """.strip(),
    """className="whitespace-nowrap transition-all flex items-center gap-1.5 snap-start font-black text-sm md:text-base px-4 py-2 md:px-0 md:py-4 rounded-full md:rounded-none border border-amber-200 md:border-0 md:border-b-2 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 shadow-xs md:bg-none md:bg-transparent md:border-b-transparent md:shadow-none hover:text-amber-800 cursor-pointer" """
)

with open('tabs_new.txt', 'w') as f:
    f.write(content)
