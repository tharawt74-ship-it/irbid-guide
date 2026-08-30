import re

with open('src/components/BusinessCard.tsx', 'r') as f:
    content = f.read()

# Update the main card wrapper for better shadow and transition
content = content.replace(
    'className="bg-white border border-[#e5e1da] rounded-[24px] md:rounded-[32px] overflow-hidden hover:shadow-xl hover:border-[#1a4d2e]/30 transition-all duration-300 flex flex-col group relative"',
    'className="bg-white border border-[#e5e1da] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(26,77,46,0.12)] hover:-translate-y-1 transition-all duration-500 flex flex-col group relative"'
)

# Update the image wrapper
content = content.replace(
    'className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"',
    'className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"'
)

# Top Badges Glassmorphism
content = content.replace(
    'className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#1a4d2e] shadow-sm"',
    'className="bg-white/70 backdrop-blur-xl border border-white/40 px-3 py-1 rounded-full text-[11px] font-black text-[#1a4d2e] shadow-[0_4px_12px_rgba(0,0,0,0.08)]"'
)
content = content.replace(
    'className="bg-yellow-400/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-yellow-900 shadow-sm flex items-center gap-1 w-fit"',
    'className="bg-gradient-to-r from-amber-400/90 to-yellow-500/90 backdrop-blur-xl border border-white/30 px-3 py-1 rounded-full text-[11px] font-black text-yellow-950 shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center gap-1 w-fit"'
)

# Favorite Button Glassmorphism
content = content.replace(
    'className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md hover:bg-white flex items-center justify-center transition-all shadow-sm border border-[#e5e1da]"',
    'className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-xl hover:bg-white flex items-center justify-center transition-all shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-white/40"'
)

# Live Working Status and District Glassmorphism
content = content.replace(
    'className="bg-black/60 text-white font-bold text-[10px] px-2.5 py-1 rounded-full backdrop-blur-md"',
    'className="bg-black/40 backdrop-blur-xl border border-white/20 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)]"'
)
content = content.replace(
    'className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md flex items-center gap-1.5 shadow-sm border ${liveStatus.badgeBg}`}',
    'className={`px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-xl flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-white/20 ${liveStatus.badgeBg.replace("bg-", "bg-opacity-80 bg-")}`}'
)

with open('src/components/BusinessCard.tsx', 'w') as f:
    f.write(content)
