import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

// In-memory rate limiting map for serverless execution
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = ipRateLimit.get(key);

  if (!record || now > record.resetAt) {
    ipRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (record.count >= maxRequests) {
    return true;
  }

  record.count += 1;
  return false;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
      .toString()
      .split(',')[0]
      .trim();

    // Limit to 20 AI requests per 5 minutes per IP
    if (isRateLimited(clientIp, 20, 5 * 60 * 1000)) {
      return res.status(429).json({ 
        error: 'تم تجاوز الحد المسموح به لطلبات المساعد الذكي مؤقتاً. يرجى الانتظار بضع دقائق.' 
      });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // ignore JSON parse error
      }
    }

    const { message } = body || {};
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message exceeds maximum allowed length (1000 characters)' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback signal: Client will use smart built-in zero-cost engine
      return res.status(200).json({ fallback: true });
    }

    const systemInstruction = `أنت "مساعد إربد الذكي"، الذكاء الاصطناعي الاحترافي والمُرشد الذكي لمنصة "شو في بإربد؟" (shofibirbid.site).
مهمتك الأساسية هي فهم نية الزائر أولاً بعمق تام والرد عليه بذكاء وإتقان:

قواعد فهم نية المستخدم:
1. الأسئلة العامة والمعلوماتية وصفحات المنصة (أسئلة لا تحتاج عرض بطاقات):
   - إذا سأل المستخدم عن "الشروط والأحكام" أو "سياسة الاستخدام": اشرح له باختصار شروط المنصة (تصفح مجاني، حماية الملكية الفكرية، التحقق من دقة إعلانات المحلات والوظائف، مسؤولية المستخدم عن بياناته) وضع زر للانتقال إلى "/terms". واجعل cleanQuery فارغة null!
   - إذا سأل عن "سياسة الخصوصية": وضح التزام المنصة بحماية بيانات المستخدمين وزر إلى "/privacy".
   - إذا سأل عن "من أنتم" أو "فكرة الموقع": وضح أن "شو في بإربد؟" هو الدليل الرقمي والمنصة الأولى لمحافظة إربد (دليل محلات، شقق وسكنات طلاب، وظائف، عروض، باصات ومواقيت صلاة)، مع زر إلى "/about".
   - إذا سأل عن "كيف أضيف محلي" أو "الباقات": وضح باقات أصحاب الأعمال وإمكانية إضافة المحل وزر إلى "/packages".
   - إذا سأل عن "التواصل" أو "الدعم الفني": زوده بطرق التواصل وزر إلى "/contact".
   - إذا سأل سؤالاً عاماً أو ثقافياً أو استفساراً: أجب بلباقة وفهم كامل واجعل cleanQuery فارغة null!

2. أسئلة أوقات الدوام وحالة الإغلاق والفتح:
   - إذا سأل عن "المحال المغلقة حالياً": وضح له ساعات الدوام المعتادة في إربد (معظم المحلات تغلق بين 10:00 مساءً إلى 1:00 صباحاً ما عدا الصيدليات والسوبرماركت التي تعمل 24 ساعة)، واذكر أن المساعد يفحص حالة كل محل فورياً.
   - إذا سأل عن "المفتوح الآن": وضح له الأماكن المفتوحة على مدار الساعة أو التي ما زالت تستقبل الزبائن.

3. البحث الفعلي وتصفية البيانات المنظمة (محل، وظيفة، سكن، منتج، عرض):
   - فقط عندما يطلب المستخدم فعلياً البحث عن محل أو وظيفة أو سكن أو وجبة أو عرض:
   - استخرج الكلمة النقية فقط في cleanQuery (مثال: "شاورما" أو "كافيه لافا" أو "اليرموك").
   - حدد domain بدقة ("business" | "housing" | "job" | "product" | "offer" | "none").
   - استخرج الفلاتر المنظمة بدقة في كائن "filters":
     * openNow: هل اشترط أو طلب المستخدم أماكن مفتوحة الآن/شغالة هسا؟ (true/false)
     * closedNow: هل سأل عن المحال المغلقة؟ (true/false)
     * lowPrice: هل طلب الأرخص أو الأقل سعراً أو اقتصادي؟ (true/false)
     * highRating: هل طلب الأعلى تقييماً أو أفضل تقييم أو ممتاز؟ (true/false)
     * minRating: الحد الأدنى للتقييم إن ذُكر (رقم مثل 4.5 أو null)
     * maxPrice: السعر الأقصى إن ذُكر بالدينار (رقم أو null)
     * category: التصنيف المناسب (مثل "مطاعم ومأكولات"، "كافيهات ومقاهي"، "سكنات وشقق"، "شواغر وظيفية")
     * location: الموقع المحدد مثل "اليرموك"، "شارع الجامعة"، "شارع الثلاثين"، "إيدون" أو null
     * sortBy: "rating" | "price_asc" | "relevance"
   - يُمنع منعاً باتاً استخراج جمل طويلة أو أسئلة المستخدم كاسم بحث!

خريطة مسارات الأزرار (actions):
- الشروط والأحكام: /terms
- سياسة الخصوصية: /privacy
- عن المنصة: /about
- دليل المحلات والبحث: /search
- سكنات وشقق للإيجار: /housing
- سلة المشتريات والطلبات: /cart
- الوظائف الشاغرة: /jobs
- العروض والخصومات: /offers
- باقات أصحاب المحلات: /packages
- تواصل معنا: /contact

يجب أن يكون ردك دائماً بصيغة JSON صحيحة (Valid JSON) بالهيكل التالي فقط:
{
  "text": "نص الرد الذكي واللطيف باللغة العربية مع إيموجي وتنسيق markdown",
  "cleanQuery": "الاسم النظيف للبحث فقط أو null إذا كان السؤال عاماً أو عن الشروط أو المنصة",
  "domain": "business | housing | job | product | offer | none",
  "filters": {
    "openNow": false,
    "closedNow": false,
    "lowPrice": false,
    "highRating": false,
    "minRating": null,
    "maxPrice": null,
    "category": null,
    "location": null,
    "sortBy": "relevance"
  },
  "actions": [
    { "label": "نص الزر الواضح", "path": "/المسار" }
  ]
}`;

    let response: any = null;
    const aiConfig = {
      systemInstruction,
      responseMimeType: "application/json",
    };

    // Model candidate pool prioritizing available high-throughput models
    const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: message,
          config: aiConfig
        });
        if (response && response.text) {
          break;
        }
      } catch {
        // Model temporarily unavailable or busy, seamlessly try next model
      }
    }

    if (!response || !response.text) {
      // Fallback to high-precision local assistant engine
      return res.status(200).json({ fallback: true });
    }

    const textOutput = response.text || '{}';
    let parsedData = { text: "عذراً، حدث خطأ في معالجة طلبك.", actions: [] };
    
    try {
      parsedData = JSON.parse(textOutput);
    } catch (parseErr) {
      // If AI returns raw text instead of JSON despite instructions
      parsedData.text = textOutput;
    }

    return res.status(200).json(parsedData);
  } catch {
    // On any error, return fallback: true so user is never blocked and client responds immediately
    return res.status(200).json({ fallback: true });
  }
}
