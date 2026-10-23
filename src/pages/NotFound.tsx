import React from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Home, Search, Compass, MapPin } from 'lucide-react';
import { SEO } from '../components/common/SEO';

export function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 bg-[#faf9f6]" dir="rtl">
      <SEO title="الصفحة غير موجودة - شو في بإربد" description="الصفحة التي تبحث عنها غير موجودة في دليل شو في بإربد" />

      {/* Visual Animation Section */}
      <div className="relative w-72 h-72 mb-8 flex items-center justify-center">
        {/* Animated Background Rings */}
        <motion.div 
          className="absolute inset-0 rounded-full bg-stone-100 border border-stone-200/50"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.div 
          className="absolute w-56 h-56 rounded-full bg-stone-50/80 border border-stone-200/30"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        />

        {/* Pulse Effect Rings */}
        <div className="absolute w-44 h-44 rounded-full bg-[#1a4d2e]/5 animate-ping opacity-60" />

        {/* Lost Compass/Pin Illustration */}
        <motion.div 
          className="relative z-10 p-6 bg-white rounded-3xl border border-stone-200 shadow-xl flex flex-col items-center justify-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, type: "spring", stiffness: 100 }}
        >
          {/* Big "404" Number */}
          <span className="text-6xl font-black tracking-widest text-[#1a4d2e] leading-none mb-2 font-display">
            404
          </span>
          
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 mb-1">
            <Compass className="h-8 w-8 text-stone-500 animate-[spin_8s_linear_infinite]" />
            <MapPin className="h-6 w-6 text-rose-500 absolute -top-1 -right-1 animate-bounce" />
          </div>
        </motion.div>

        {/* Lost Pins Floating Around */}
        <motion.div 
          className="absolute top-8 left-12 p-1.5 bg-[#1a4d2e]/10 text-[#1a4d2e] rounded-full border border-[#1a4d2e]/20"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3, delay: 0.5, ease: "easeInOut" }}
        >
          <Search className="h-4 w-4" />
        </motion.div>

        <motion.div 
          className="absolute bottom-12 right-12 p-1.5 bg-rose-50 text-rose-500 rounded-full border border-rose-100"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 4, delay: 1, ease: "easeInOut" }}
        >
          <MapPin className="h-4 w-4" />
        </motion.div>
      </div>

      {/* Text/Content Section */}
      <motion.div 
        className="max-w-md text-center space-y-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-black text-stone-800 tracking-tight">
          عذراً، العنوان مفقود أو الصفحة غير موجودة!
        </h1>
        <p className="text-sm text-stone-500 leading-relaxed max-w-sm mx-auto font-medium">
          يبدو أنك سلكت طريقاً غير صحيح، أو أن الصفحة التي تبحث عنها تم نقلها أو لم تعد متوفرة في الدليل.
        </p>
      </motion.div>

      {/* Buttons & Actions */}
      <motion.div 
        className="flex flex-col sm:flex-row items-center gap-3 mt-8 w-full max-w-xs sm:max-w-md justify-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <Link 
          to="/" 
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1a4d2e] hover:bg-[#123620] text-white rounded-xl text-sm font-black shadow-md hover:shadow-lg transition-all active:scale-95 duration-200"
        >
          <Home className="h-4 w-4" />
          <span>العودة للرئيسية</span>
        </Link>
        <Link 
          to="/search" 
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-sm font-bold border border-stone-200 hover:border-stone-300 shadow-2xs transition-all active:scale-95 duration-200"
        >
          <Search className="h-4 w-4" />
          <span>ابحث في الدليل</span>
        </Link>
      </motion.div>
    </div>
  );
}
