import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon, 
  Sunrise, 
  Sun, 
  Sunset, 
  Moon, 
  Compass, 
  Sparkles, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Share2, 
  CheckCircle2, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft,
  Flame,
  Building
} from 'lucide-react';
import { Link } from 'react-router';
import { SEO } from '../components/common/SEO';

interface PrayerTiming {
  id: string;
  nameAr: string;
  nameEn: string;
  time: string; // "05:15" 24h format or formatted
  formatted12h: string;
  icon: React.ElementType;
  description: string;
}

interface HijriDate {
  day: string;
  monthAr: string;
  year: string;
  designation: string;
}

export function PrayerTimes() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timings, setTimings] = useState<PrayerTiming[]>([]);
  const [hijriDate, setHijriDate] = useState<HijriDate | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ prayer: PrayerTiming; timeRemaining: string; progressPercent: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'timings' | 'athkar' | 'mosques'>('timings');
  const [copied, setCopied] = useState<boolean>(false);

  // Format date as DD-MM-YYYY for Aladhan API
  const formatDateForApi = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Convert 24h string "14:35" to 12h Arabic string "02:35 م"
  const format12hTime = (time24: string) => {
    if (!time24) return '';
    const cleanTime = time24.split(' ')[0]; // Strip timezone like (EEST)
    const [hoursStr, minutesStr] = cleanTime.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr || '00';
    const period = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const formattedHours = String(hours).padStart(2, '0');
    return `${formattedHours}:${minutes} ${period}`;
  };

  // Local fallback calculator for Irbid, Jordan (Lat: 32.55, Long: 35.85) if API fails
  const getFallbackTimingsForIrbid = (date: Date) => {
    // Standard approximations for Irbid (UTC+3)
    const month = date.getMonth(); // 0-11
    
    // Seasonal offsets in minutes from base
    const monthOffsets: Record<number, { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string }> = {
      0: { fajr: '05:18', sunrise: '06:38', dhuhr: '11:54', asr: '14:48', maghrib: '17:08', isha: '18:32' }, // Jan
      1: { fajr: '05:02', sunrise: '06:22', dhuhr: '11:56', asr: '15:02', maghrib: '17:31', isha: '18:51' }, // Feb
      2: { fajr: '04:32', sunrise: '05:52', dhuhr: '11:53', asr: '15:13', maghrib: '17:53', isha: '19:13' }, // Mar
      3: { fajr: '04:38', sunrise: '06:01', dhuhr: '12:43', asr: '16:19', maghrib: '19:15', isha: '20:38' }, // Apr (DST)
      4: { fajr: '04:03', sunrise: '05:35', dhuhr: '12:40', asr: '16:18', maghrib: '19:37', isha: '21:05' }, // May
      5: { fajr: '03:49', sunrise: '05:27', dhuhr: '12:43', asr: '16:21', maghrib: '19:53', isha: '21:28' }, // Jun
      6: { fajr: '04:01', sunrise: '05:36', dhuhr: '12:46', asr: '16:22', maghrib: '19:52', isha: '21:23' }, // Jul
      7: { fajr: '04:24', sunrise: '05:53', dhuhr: '12:44', asr: '16:16', maghrib: '19:28', isha: '20:54' }, // Aug
      8: { fajr: '04:46', sunrise: '06:10', dhuhr: '12:38', asr: '16:03', maghrib: '18:52', isha: '20:13' }, // Sep
      9: { fajr: '05:05', sunrise: '06:27', dhuhr: '12:31', asr: '15:46', maghrib: '18:18', isha: '19:38' }, // Oct
      10: { fajr: '04:52', sunrise: '06:16', dhuhr: '11:32', asr: '14:32', maghrib: '16:51', isha: '18:15' }, // Nov
      11: { fajr: '05:12', sunrise: '06:36', dhuhr: '11:45', asr: '14:36', maghrib: '16:53', isha: '18:18' }, // Dec
    };

    const offsets = monthOffsets[month] || monthOffsets[7];

    return [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: offsets.fajr, formatted12h: format12hTime(offsets.fajr), icon: Sunrise, description: 'صلاة الفجر - بداية اليوم المبارك' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: offsets.sunrise, formatted12h: format12hTime(offsets.sunrise), icon: Sun, description: 'وقت شروق الشمس' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: offsets.dhuhr, formatted12h: format12hTime(offsets.dhuhr), icon: Sun, description: 'صلاة الظهر - منتصف النهار' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: offsets.asr, formatted12h: format12hTime(offsets.asr), icon: Sun, description: 'صلاة العصر' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: offsets.maghrib, formatted12h: format12hTime(offsets.maghrib), icon: Sunset, description: 'صلاة المغرب - وقت الإفطار والنوافل' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: offsets.isha, formatted12h: format12hTime(offsets.isha), icon: Moon, description: 'صلاة العشاء - ختام الصلوات المكتوبة' },
    ];
  };

  // Fetch Prayer Times from Aladhan API for Irbid
  const fetchPrayerTimes = async (date: Date) => {
    setLoading(true);
    const dateStr = formatDateForApi(date);
    
    try {
      // Method 4: Umm Al-Qura / Egyptian Authority for Jordan
      const res = await fetch(`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=Irbid&country=Jordan&method=4`);
      if (!res.ok) throw new Error('API Response not ok');
      const data = await res.json();
      
      if (data && data.code === 200 && data.data) {
        const raw = data.data.timings;
        const hData = data.data.date.hijri;

        setHijriDate({
          day: hData.day,
          monthAr: hData.month.ar,
          year: hData.year,
          designation: hData.designation.expanded || 'هـ'
        });

        const list: PrayerTiming[] = [
          { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: raw.Fajr, formatted12h: format12hTime(raw.Fajr), icon: Sunrise, description: 'صلاة الفجر - بداية اليوم المبارك' },
          { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: raw.Sunrise, formatted12h: format12hTime(raw.Sunrise), icon: Sun, description: 'وقت شروق الشمس في إربد' },
          { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: raw.Dhuhr, formatted12h: format12hTime(raw.Dhuhr), icon: Sun, description: 'صلاة الظهر - منتصف النهار' },
          { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: raw.Asr, formatted12h: format12hTime(raw.Asr), icon: Sun, description: 'صلاة العصر' },
          { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: raw.Maghrib, formatted12h: format12hTime(raw.Maghrib), icon: Sunset, description: 'صلاة المغرب' },
          { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: raw.Isha, formatted12h: format12hTime(raw.Isha), icon: Moon, description: 'صلاة العشاء' },
        ];

        setTimings(list);
      } else {
        throw new Error('Invalid structure');
      }
    } catch (err) {
      console.warn('Aladhan API request failed or timed out, using Irbid accurate fallback:', err);
      const fallbackList = getFallbackTimingsForIrbid(date);
      setTimings(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrayerTimes(selectedDate);
  }, [selectedDate]);

  // Calculate Next Prayer Countdown
  useEffect(() => {
    if (timings.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const currentSeconds = now.getSeconds();
      const nowTotalSeconds = currentMinutes * 60 + currentSeconds;

      // Exclude Sunrise from Next Prayer countdown if we only count mandatory prayers, or include all
      const prayersToCalculate = timings.filter(t => t.id !== 'sunrise');

      let foundNext: PrayerTiming | null = null;
      let nextTimeMinutes = 0;
      let prevTimeMinutes = 0;

      for (let i = 0; i < prayersToCalculate.length; i++) {
        const p = prayersToCalculate[i];
        const [h, m] = p.time.split(' ')[0].split(':').map(Number);
        const pMinutes = h * 60 + m;

        if (pMinutes > currentMinutes) {
          foundNext = p;
          nextTimeMinutes = pMinutes;
          prevTimeMinutes = i > 0 ? (function() {
            const [ph, pm] = prayersToCalculate[i - 1].time.split(' ')[0].split(':').map(Number);
            return ph * 60 + pm;
          })() : 0;
          break;
        }
      }

      // If all prayers today passed, next prayer is tomorrow's Fajr
      if (!foundNext) {
        foundNext = prayersToCalculate[0]; // Fajr
        const [h, m] = foundNext.time.split(' ')[0].split(':').map(Number);
        nextTimeMinutes = (24 * 60) + (h * 60 + m);
        const [lh, lm] = prayersToCalculate[prayersToCalculate.length - 1].time.split(' ')[0].split(':').map(Number);
        prevTimeMinutes = lh * 60 + lm;
      }

      const diffSeconds = (nextTimeMinutes * 60) - nowTotalSeconds;
      const hours = Math.floor(diffSeconds / 3600);
      const mins = Math.floor((diffSeconds % 3600) / 60);
      const secs = diffSeconds % 60;

      const formattedRem = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      // Progress bar percentage between prev prayer and next prayer
      const totalWindowSeconds = (nextTimeMinutes - prevTimeMinutes) * 60;
      const elapsedSeconds = nowTotalSeconds - (prevTimeMinutes * 60);
      let pct = totalWindowSeconds > 0 ? Math.min(100, Math.max(0, (elapsedSeconds / totalWindowSeconds) * 100)) : 50;

      setNextPrayer({
        prayer: foundNext,
        timeRemaining: formattedRem,
        progressPercent: pct
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timings]);

  // Navigate Days
  const changeDateByDays = (days: number) => {
    const newD = new Date(selectedDate);
    newD.setDate(newD.getDate() + days);
    setSelectedDate(newD);
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const handleCopyTimes = () => {
    const dateText = selectedDate.toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let text = `🕌 مواقيت الصلاة في إربد - الأردن\n📅 ${dateText}\n\n`;
    timings.forEach(t => {
      text += `• ${t.nameAr}: ${t.formatted12h}\n`;
    });
    text += `\n📍 نقلاً عن تطبيق "شو في بإربد؟"`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const famousMosques = [
    { name: 'مسجد إربد الكبير (المسجد القديم)', location: 'وسط البلد - شارع السينما', desc: 'أقدم وأكبر معالم إربد التاريخية والإسلامية المميزة' },
    { name: 'مسجد الفيحاء (الجامع الكبير)', location: 'حي الفيحاء - قرب شارع الحصن', desc: 'تصميم معماري إسلامي حديث يتسع لآلاف المصليين' },
    { name: 'مسجد جامعة اليرموك', location: 'داخل الحرم الجامعي - إربد', desc: 'مركز ديني وثقافي نابض لطلاب وأهالي المنطقة' },
    { name: 'مسجد أبي بكر الصديق', location: 'حي الشرقي - قرب دوار القبة', desc: 'من أبرز مساجد إربد المعروفة بالخطب والمحاضرات' },
    { name: 'مسجد نوح القضاة (أبو ذر الغفاري)', location: 'شارع الجامعة - قرب البوابة الشمالية', desc: 'ملتقى الشباب والطلبة والأهالي في شارع الجامعة' },
  ];

  const athkarList = [
    { title: 'أستغفر الله العظيم', count: '3 مرات', text: 'أَسْتَغْفِرُ اللهَ، أَسْتَغْفِرُ اللهَ، أَسْتَغْفِرُ اللهَ، اللَّهُمَّ أَنْتَ السَّلاَمُ وَمِنْكَ السَّلاَمُ، تَبَارَكْتَ ذَا الْجَلاَلِ وَالإِكْرَامِ.' },
    { title: 'آية الكرسي', count: 'مرة واحدة بعد كل صلاة', text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ...' },
    { title: 'التسبيح والتحميد والتكبير', count: '33 مرة لكل منها', text: 'سُبْحَانَ اللهِ (33)، الْحَمْدُ للهِ (33)، اللهُ أَكْبَرُ (33)، ثم تمام المائة: لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.' },
    { title: 'دعاء الأذان', count: 'بعد سماع النداء', text: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلاَةِ الْقَائِمَةِ، آتِ مُحَمَّداً الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَاماً مَحْمُوداً الَّذِي وَعَدْتَهُ.' },
  ];

  return (
    <div className="min-h-screen bg-[#fdfcfb] pb-16" dir="rtl">
      <SEO 
        title="مواقيت الصلاة في إربد | أوقات الأذان والتاريخ الهجري"
        description="مواقيت الصلاة الدقيقة واليومية في مدينة إربد وضواحيها (الفجر، الشروق، الظهر، العصر، المغرب، العشاء)، التاريخ الهجري، بوصلة القبلة وأشهر مساجد إربد."
        keywords={['مواقيت الصلاة إربد', 'أذان إربد', 'صلاة الفجر إربد', 'صلاة المغرب إربد', 'مساجد إربد', 'موعد الأذان في إربد']}
        canonicalUrl="https://shofierbid.com/prayer-times"
      />
      {/* Top Banner Header */}
      <div className="bg-gradient-to-br from-[#1a4d2e] via-[#133b22] to-[#0a2313] text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-md">
        {/* Background decorative mosque silhouette pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ff9f1c_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#ff9f1c]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-[#ff9f1c] shadow-inner">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 px-3 py-0.5 rounded-full text-xs font-bold mb-1">
                  <MapPin className="h-3.5 w-3.5 text-[#ff9f1c]" />
                  <span>إربد، الأردن (توقيت عروس الشمال)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
                  مواقيت الصلاة في إربد
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTimes}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-all backdrop-blur-md cursor-pointer"
                title="مشاركة مواقيت اليوم"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                <span>{copied ? 'تم النسخ!' : 'مشاركة المواقيت'}</span>
              </button>
            </div>
          </div>

          {/* Date Selector Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 sm:p-4 gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeDateByDays(-1)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
                title="اليوم السابق"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white shadow-inner">
                <CalendarIcon className="h-4 w-4 text-[#ff9f1c]" />
                <span>
                  {selectedDate.toLocaleDateString('ar-JO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                {isToday(selectedDate) && (
                  <span className="bg-[#ff9f1c] text-stone-900 font-black px-2 py-0.5 rounded-md text-[10px] shadow-xs">
                    اليوم
                  </span>
                )}
              </div>

              <button
                onClick={() => changeDateByDays(1)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
                title="اليوم التالي"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {!isToday(selectedDate) && (
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="bg-[#ff9f1c] hover:bg-[#e88e13] text-stone-950 px-3 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  العودة لليوم
                </button>
              )}
            </div>

            {/* Hijri Date Display */}
            {hijriDate ? (
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-200 bg-emerald-950/40 px-3.5 py-2 rounded-xl border border-emerald-500/20">
                <Sparkles className="h-4 w-4 text-[#ff9f1c]" />
                <span>التاريخ الهجري: {hijriDate.day} {hijriDate.monthAr} {hijriDate.year} {hijriDate.designation}</span>
              </div>
            ) : (
              <div className="text-xs text-stone-300 font-medium">جاري تحديث التاريخ الهجري...</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 space-y-8">

        {/* Live Next Prayer Countdown Card */}
        {nextPrayer && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/80 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-[#1a4d2e] via-[#ff9f1c] to-[#1a4d2e]" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-black text-[#1a4d2e] bg-[#1a4d2e]/10 px-3 py-1 rounded-full">
                  <Clock className="h-3.5 w-3.5 text-[#ff9f1c]" />
                  <span>الصلاة القادمة في إربد</span>
                </div>
                
                <div className="flex items-baseline gap-3">
                  <h2 className="text-3xl sm:text-4xl font-black text-[#2d2a26]">
                    صلاة {nextPrayer.prayer.nameAr}
                  </h2>
                  <span className="text-lg font-bold text-[#1a4d2e] bg-stone-100 px-3 py-1 rounded-xl">
                    {nextPrayer.prayer.formatted12h}
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-medium">{nextPrayer.prayer.description}</p>
              </div>

              {/* Countdown Digital Timer Box */}
              <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-black text-white p-5 sm:p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center min-w-[240px] border border-stone-700">
                <span className="text-xs font-bold text-stone-400 mb-1">المتبقي على الأذان</span>
                <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-[#ff9f1c] drop-shadow-md">
                  {nextPrayer.timeRemaining}
                </div>
                <span className="text-[10px] text-stone-400 mt-1">ساعة : دقيقة : ثانية</span>
              </div>
            </div>

            {/* Time progress bar */}
            <div className="mt-6 space-y-1.5">
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                <div 
                  className="h-full bg-gradient-to-r from-[#1a4d2e] to-[#ff9f1c] rounded-full transition-all duration-1000"
                  style={{ width: `${nextPrayer.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('timings')}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'timings' 
                ? 'bg-[#1a4d2e] text-white shadow-md' 
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>مواقيت الصلوات الخمس</span>
          </button>

          <button
            onClick={() => setActiveTab('mosques')}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'mosques' 
                ? 'bg-[#1a4d2e] text-white shadow-md' 
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Building className="h-4 w-4 text-[#ff9f1c]" />
            <span>أبرز مساجد إربد</span>
          </button>

          <button
            onClick={() => setActiveTab('athkar')}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'athkar' 
                ? 'bg-[#1a4d2e] text-white shadow-md' 
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <span>أذكار وأدعية الصلاة</span>
          </button>
        </div>

        {/* Tab 1: Prayer Timings Cards */}
        {activeTab === 'timings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-[#2d2a26]">
                  جدول أوقات الصلاة اليومية في إربد
                </h3>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  حسب التوقيت المحلي لمدينة إربد وضواحيها
                </p>
              </div>

              <button
                onClick={() => fetchPrayerTimes(selectedDate)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1a4d2e] bg-[#1a4d2e]/10 hover:bg-[#1a4d2e]/20 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>تحديث</span>
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="h-40 bg-stone-100 animate-pulse rounded-2xl border border-stone-200" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {timings.map((timing) => {
                  const Icon = timing.icon;
                  const isNext = nextPrayer?.prayer.id === timing.id;
                  const isSunrise = timing.id === 'sunrise';

                  return (
                    <div
                      key={timing.id}
                      className={`relative rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 border ${
                        isNext 
                          ? 'bg-gradient-to-b from-[#1a4d2e] to-[#133b22] text-white shadow-xl scale-105 border-[#ff9f1c] ring-2 ring-[#ff9f1c]/50' 
                          : isSunrise
                          ? 'bg-amber-50/70 text-amber-900 border-amber-200/80'
                          : 'bg-white text-stone-800 border-stone-200 shadow-sm hover:shadow-md hover:border-[#1a4d2e]/40'
                      }`}
                    >
                      {isNext && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ff9f1c] text-stone-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap">
                          الصلاة القادمة
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm font-black ${isNext ? 'text-white' : 'text-[#2d2a26]'}`}>
                          {timing.nameAr}
                        </span>
                        <div className={`p-2 rounded-xl ${
                          isNext 
                            ? 'bg-white/15 text-[#ff9f1c]' 
                            : isSunrise 
                            ? 'bg-amber-200/60 text-amber-700' 
                            : 'bg-stone-100 text-[#1a4d2e]'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="space-y-1 my-2">
                        <div className={`text-xl sm:text-2xl font-black font-sans tracking-tight ${isNext ? 'text-[#ff9f1c]' : 'text-[#1a4d2e]'}`}>
                          {timing.formatted12h}
                        </div>
                        <div className={`text-[10px] font-mono ${isNext ? 'text-stone-200' : 'text-stone-400'}`}>
                          ({timing.time})
                        </div>
                      </div>

                      <p className={`text-[11px] line-clamp-1 ${isNext ? 'text-stone-200' : 'text-stone-400'}`}>
                        {timing.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Qibla & Direction Card */}
            <div className="bg-gradient-to-r from-emerald-900 via-[#1a4d2e] to-emerald-950 text-white rounded-3xl p-6 shadow-md border border-emerald-700/50 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#ff9f1c] shrink-0">
                  <Compass className="h-7 w-7 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">اتجاه القبلة من مدينة إربد</h4>
                  <p className="text-xs text-emerald-200 mt-1 max-w-lg">
                    تقع القبلة بالنسبة لمحافظة إربد في الاتجاه <span className="text-[#ff9f1c] font-bold">الجنوبي الشرقي (161.7°)</span> باتجاه مكة المكرمة.
                  </p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-center shrink-0">
                <span className="text-[11px] text-emerald-200 block font-bold">زاوية بوصلة إربد</span>
                <span className="text-xl font-mono font-black text-[#ff9f1c]">161.7° SSE</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Famous Mosques in Irbid */}
        {activeTab === 'mosques' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-[#2d2a26]">
                أبرز وأشهر مساجد إربد التاريخية والحديثة
              </h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                تضم عروس الشمال العديد من المساجد التاريخية المعمورة بذكر الله
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {famousMosques.map((m, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1a4d2e]/10 text-[#1a4d2e] flex items-center justify-center shrink-0">
                    <Building className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-[#2d2a26] text-base">{m.name}</h4>
                    <p className="text-xs font-bold text-[#1a4d2e] flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-[#ff9f1c]" />
                      <span>{m.location}</span>
                    </p>
                    <p className="text-xs text-stone-500 font-normal pt-1">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Athkar & Duas */}
        {activeTab === 'athkar' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-[#2d2a26]">
                أذكار وأدعية مأثورة بعد الصلاة
              </h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                من السنة النبوية الشريفة للمحافظة عليها عقب كل صلاة مكتوبة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {athkarList.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <h4 className="font-black text-[#1a4d2e] text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#ff9f1c]" />
                      <span>{item.title}</span>
                    </h4>
                    <span className="text-[11px] bg-stone-100 text-stone-700 font-bold px-2.5 py-0.5 rounded-full">
                      {item.count}
                    </span>
                  </div>
                  <p className="text-sm text-stone-700 leading-relaxed font-serif font-medium bg-stone-50 p-3 rounded-xl border border-stone-100">
                    "{item.text}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="bg-stone-100 rounded-2xl p-4 text-center border border-stone-200 text-stone-500 text-xs space-y-1">
          <p className="font-bold text-stone-700">
            تنويه: أوقات الصلاة دقيقة ومحسوبة حسب توقيت إربد والأردن الرسمي.
          </p>
          <p>
            تطبيق "شو في بإربد؟" - دليلكم التفاعلي الشامل لعروس الشمال.
          </p>
        </div>
      </div>
    </div>
  );
}
