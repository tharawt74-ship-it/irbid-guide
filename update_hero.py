import re

with open('src/pages/Home.tsx', 'r') as f:
    content = f.read()

pattern = r'\{\/\*\s*Hero Section\s*\*\/\}.*?\{\/\*\s*Unified Intelligent Search & Filters Deck\s*\*\/\}'

replacement = r'''{/* Hero Section - Premium Level */}
      <div className="bg-[#0f3820] rounded-2xl md:rounded-[32px] py-10 md:py-20 px-4 sm:p-6 md:p-16 text-white flex flex-col items-center text-center relative overflow-hidden shadow-2xl shadow-[#1a4d2e]/20 min-h-[350px] md:min-h-[500px] justify-center">
        
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a4d2e] via-[#0f3820] to-[#0a2414] z-0"></div>
        
        {/* Modern Fading Grid (SVG Mask) */}
        <div 
          className="absolute inset-0 z-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)'
          }}
        ></div>

        {/* Ambient Glow Orbs */}
        <div className="absolute top-0 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-[#ff9f1c] rounded-full blur-[80px] md:blur-[120px] opacity-20 animate-pulse mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-emerald-400 rounded-full blur-[80px] md:blur-[120px] opacity-10 mix-blend-screen pointer-events-none"></div>

        {/* Floating Micro-elements (Hidden on very small screens to avoid clutter) */}
        <div className="absolute top-10 right-10 md:top-20 md:right-32 opacity-20 animate-[bounce_5s_infinite] hidden sm:block pointer-events-none">
          <MapPin className="h-8 w-8 text-white rotate-12" />
        </div>
        <div className="absolute bottom-20 left-10 md:bottom-32 md:left-24 opacity-20 animate-[bounce_6s_infinite_reverse] hidden sm:block pointer-events-none">
          <UtensilsCrossed className="h-10 w-10 text-white -rotate-12" />
        </div>
        <div className="absolute top-32 left-12 md:top-40 md:left-40 opacity-20 animate-[pulse_4s_infinite] hidden lg:block pointer-events-none">
          <Coffee className="h-12 w-12 text-[#ff9f1c] rotate-45" />
        </div>
        <div className="absolute bottom-16 right-12 md:bottom-24 md:right-48 opacity-20 animate-[pulse_5s_infinite] hidden lg:block pointer-events-none">
          <ShoppingCart className="h-10 w-10 text-emerald-300 -rotate-12" />
        </div>
        
        <div className="relative z-10 w-full max-w-3xl mx-auto space-y-4 md:space-y-6">
          {/* Eyebrow Badge */}
          <span className="inline-flex items-center gap-1.5 py-1 px-3 md:py-1.5 md:px-5 rounded-full bg-white/10 border border-white/20 text-white/90 text-[10px] md:text-sm font-bold backdrop-blur-md mb-2 shadow-lg">
            <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-[#ff9f1c]" />
            اكتشف أفضل ما في إربد
          </span>
          
          {/* Gradient Typography Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
            شو في بـ <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#ff9f1c] to-amber-300">إربد؟</span>
          </h1>
          
          <p className="text-sm sm:text-base md:text-xl text-emerald-50/80 max-w-2xl mx-auto leading-relaxed px-4 font-medium">
            ابحث عن المطاعم، المقاهي، المحلات التجارية، والخدمات المميزة في مدينتك بكل سهولة وبحث ذكي.
          </p>

          {/* Glassmorphism Search Bar */}
          <div className="mt-6 md:mt-10 w-full max-w-2xl mx-auto relative group">
            <div className="absolute inset-y-0 right-0 pr-4 md:pr-6 flex items-center pointer-events-none text-white/60 group-focus-within:text-amber-300 transition-colors z-20">
              <Search className="h-5 w-5 md:h-7 md:w-7 drop-shadow-md" />
            </div>
            <input
              type="text"
              className="block w-full pr-12 pl-10 py-3.5 md:pr-16 md:pl-6 md:py-5 border border-white/20 rounded-2xl md:rounded-[28px] leading-5 bg-white/10 backdrop-blur-xl text-white placeholder-white/70 focus:outline-none focus:ring-4 focus:ring-amber-500/30 focus:border-amber-400/50 focus:bg-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.2)] font-bold text-sm md:text-lg transition-all duration-300"
              placeholder="عن ماذا تبحث؟ (مثال: شاورما، ملابس)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-1.5 md:p-2 transition-colors cursor-pointer text-xs md:text-sm z-20"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dynamic Smart Suggestions Deck with continuous auto-rotation & animation */}
          <DynamicSmartSuggestions onSelectSuggestion={(queryText) => setSearchTerm(queryText)} />

          {/* Intelligent Search Feedback Badge */}
          {searchTerm && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-amber-50 text-[10px] md:text-xs font-black bg-black/30 backdrop-blur-md py-1.5 px-3 md:py-2 md:px-4 rounded-xl border border-amber-500/30 text-right shadow-xl">
              <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-amber-400 animate-pulse shrink-0" />
              <span>محركنا الذكي يبحث الآن في المرادفات والتصنيفات بدقة ✨</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 text-center text-sm md:text-base font-medium mb-4">
          {error}
        </div>
      )}

      {/* Unified Intelligent Search & Filters Deck */}'''

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/pages/Home.tsx', 'w') as f:
    f.write(new_content)
