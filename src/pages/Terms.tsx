import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { SEO } from '../components/common/SEO';

export function Terms() {
  const { staticPages } = useSystemSettings();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <SEO title="الشروط والأحكام" description="الشروط والأحكام الخاصة بمنصة شو في بإربد" />
      <h1 className="text-3xl font-black text-[#1a4d2e] mb-8">الشروط والأحكام</h1>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e1da] whitespace-pre-wrap leading-relaxed text-stone-700">
        {staticPages.termsText || "لم يتم إضافة الشروط والأحكام بعد."}
      </div>
    </div>
  );
}
