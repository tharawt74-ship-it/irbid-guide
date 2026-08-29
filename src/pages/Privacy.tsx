import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { SEO } from '../components/common/SEO';

export function Privacy() {
  const { staticPages } = useSystemSettings();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <SEO title="سياسة الخصوصية" description="سياسة الخصوصية لمنصة شو في بإربد" />
      <h1 className="text-3xl font-black text-[#1a4d2e] mb-8">سياسة الخصوصية</h1>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e1da] whitespace-pre-wrap leading-relaxed text-stone-700">
        {staticPages.privacyText || "لم يتم إضافة سياسة الخصوصية بعد."}
      </div>
    </div>
  );
}
