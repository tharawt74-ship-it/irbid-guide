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

let cachedAiEnabled: boolean | null = null;
let lastAiCheckTime = 0;

async function checkIsAiEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedAiEnabled !== null && (now - lastAiCheckTime < 10000)) {
    return cachedAiEnabled;
  }

  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'irbid-7f4dd';
    const apiKey = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDDswaCceyey9mjAC7ERlkPQ0dIkNsbquw';

    // 1. Check settings/appConfig
    try {
      const restUrlAppConfig = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/appConfig?key=${apiKey}`;
      const resAppConfig = await fetch(restUrlAppConfig);
      if (resAppConfig.ok) {
        const data = await resAppConfig.json();
        if (data.fields?.enableAiAssistant?.booleanValue === false) {
          cachedAiEnabled = false;
          lastAiCheckTime = now;
          return false;
        }
      }
    } catch {
      // ignore
    }

    // 2. Check systemConfig/settings
    try {
      const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/systemConfig/settings?key=${apiKey}`;
      const res = await fetch(restUrl);
      if (res.ok) {
        const data = await res.json();
        const globalFields = data.fields?.globalSettings?.mapValue?.fields;
        if (globalFields?.enableAiAssistant?.booleanValue === false) {
          cachedAiEnabled = false;
          lastAiCheckTime = now;
          return false;
        }
      }
    } catch {
      // ignore
    }

    cachedAiEnabled = true;
    lastAiCheckTime = now;
    return true;
  } catch (e) {
    console.warn('Could not check AI status in Firestore REST:', e);
    if (cachedAiEnabled !== null) return cachedAiEnabled;
    return true;
  }
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

  // 0. Strict Database & Backend Check: Verify if AI is disabled by administration
  const isAiEnabled = await checkIsAiEnabled();
  if (!isAiEnabled) {
    return res.status(403).json({
      error: 'المساعد الذكي معطل حالياً من قبل إدارة المنصة',
      disabled: true
    });
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

قواعد فهم نية المستخدم وسير المحادثة (Intent Analysis & Multi-Turn Clarification):

1. الاستيضاح الذكي للطلبات العامة أو غير المحددة (Clarification Before Search):
   - إذا أخبرك الزائر أنه جائع (مثل: "أنا جوعان"، "جوعان"، "جعت"، "شو آكل"، "شو تنصحني أتعشى"):
     * لا تقم بالبحث فوراً! اسأله أولاً بلطف عن نوع أكله المفضل:
       "صحة وهنا مقدماً يا غالي! 😋🍽️ شو بتحب نوع الأكل المفضل اللي عبالك هسا؟"
     * اجعل "cleanQuery": null و "domain": "none".
     * في "actions"، قدم له خيارات تفاعلية سريعة تملأ السؤال:
       [
         { "label": "🍕 بيتزا ومعجنات", "path": "query:بدي بيتزا مفتوح", "query": "بدي بيتزا مفتوح" },
         { "label": "🌯 شاورما وسناكات", "path": "query:مطعم شاورما فاتح", "query": "مطعم شاورما فاتح" },
         { "label": "🍔 برجر وساندويشات", "path": "query:مطعم برجر مفتوح", "query": "مطعم برجر مفتوح" },
         { "label": "🍗 مشاوي ودجاج", "path": "query:مطاعم مشاوي مفتوحة", "query": "مطاعم مشاوي مفتوحة" },
         { "label": "🏷️ تصفح عروض المطاعم", "path": "/offers" }
       ]
   - إذا قال الزائر "بدي شغل" أو "بدور على شغل" أو "في وظائف" دون تحديد مجال أو تخصص:
     * لا تبحث عشوائياً! اسأله أولاً بلباقة عن مجاله وتخصصه:
       "أهلاً بك وسعداء بمساعدتك لإيجاد فرصة العمل المناسبة في إربد! 💼🤝 شو بدك شغل وبأي مجال أو تخصص بتبحث؟"
     * اجعل "cleanQuery": null و "domain": "none".
     * في "actions"، قدم له تخصصات شائعة بنقرة واحدة:
       [
         { "label": "🛒 كاشير ومبيعات", "path": "query:وظيفة كاشير ومبيعات", "query": "وظيفة كاشير ومبيعات" },
         { "label": "☕ باريستا وضيافة", "path": "query:وظيفة باريستا", "query": "وظيفة باريستا" },
         { "label": "🎧 تسويق وخدمة عملاء", "path": "query:وظائف تسويق ومبيعات", "query": "وظائف تسويق ومبيعات" },
         { "label": "🚗 سائق وتوصيل", "path": "query:وظيفة سائق وتوصيل", "query": "وظيفة سائق وتوصيل" },
         { "label": "💼 تصفح كافة الوظائف", "path": "/jobs" }
       ]

2. متابعة إجابة الزائر وتنفيذ البحث الدقيق:
   - عندما يرد الزائر على سؤالك بنوع الأكل (مثلاً: "بيتزا" أو "بدي بيتزا"):
     * ابحث له فوراً عن مطاعم البيتزا المفتوحة وعروض البيتزا!
     * cleanQuery: "بيتزا", domain: "product" أو "business", openNow: true.
   - عندما يحدد الزائر مجال الوظيفة (مثلاً: "كاشير"):
     * ابحث له في الشواغر المنشورة. وإذا لم تتوفر شواغر في مجاله، اعتذر منه بلباقة:
       "عذراً منك، لا تتوفر شواغر وظيفية حالياً في مجال [المجال] منشورة على الموقع 💼..." مع روابط لقسم الوظائف ونشر إعلان.

3. دقة استخراج الفلاتر التخصصية للأمثلة الصريحة:
   - إذا قال: "بدي جيم في شارع الجامعة" أو "نوادي لياقة في شارع الجامعة":
     * cleanQuery: "جيم" أو "لياقة"
     * domain: "business"
     * filters: { location: "شارع الجامعة", category: "أندية ورياضة" }
   - إذا قال: "بدي دكتور قلبية شاطر" أو "طبيب قلب ممتاز":
     * cleanQuery: "قلبية" أو "أمراض القلب والشرايين"
     * domain: "business"
     * filters: { highRating: true, minRating: 4.5, category: "صيدليات ومراكز طبية", sortBy: "rating" }
   - إذا قال: "أنا بدي مطعم شاورما فاتح":
     * cleanQuery: "شاورما" فقط! (تجريد كلمات أنا بدي / مطعم / فاتح).
     * domain: "business"
     * filters: { openNow: true, category: "مطاعم ومأكولات" }
   - إذا قال: "بدي دكتور باطني شاطر":
     * cleanQuery: "باطني" فقط! (تجريد بدي / دكتور / شاطر).
     * domain: "business"
     * filters: { highRating: true, minRating: 4.5, category: "صيدليات ومراكز طبية", sortBy: "rating" }

4. الأسئلة العامة والمعلوماتية وصفحات المنصة:
   - إذا سأل المستخدم عن الشروط والأحكام أو الخصوصية أو عن المنصة أو باقات الاشتراك:
     أجب بإيجاز وبشكل مفيد واجعل cleanQuery فارغة null و domain: "none".

5. حظر الإحالات الباردة ووجوب تقديم اقتراحات وبطاقات تفاعلية (Strict No-Redirect Rule):
   - يُمنع منعاً باتاً الإجابة بعبارات سطحية أو إحالات باردة مثل "يمكنك زيارة صفحة العروض والتخفيضات حيث ستجد كافة التفاصيل" أو "يمكنك زيارة صفحة كذا" عندما يطلب الزائر عرض أكل أو أي عروض، خصومات، وجبات، مطاعم، سكنات، وظائف، أو محلات!
   - بدلاً من ذلك، يجب دائماً كتابة رد تفاعلي لطيف يُشير لأقوى الخيارات، وتحديد "domain" بدقة ("offer" أو "product" أو "business" أو "housing" أو "job") مع "cleanQuery" دقيق:
     * إذا قال: "بدي عرض أكل" أو "عروض أكل":
       cleanQuery: "أكل", domain: "offer", filters: { category: "مطاعم ومأكولات" }
     * إذا قال: "عرض شاورما" أو "عروض بيتزا":
       cleanQuery: "شاورما" أو "بيتزا", domain: "offer", filters: { category: "مطاعم ومأكولات" }
     * إذا قال: "بدي عروض" أو "عروض اليوم":
       cleanQuery: null, domain: "offer"
     * إذا قال: "عروض ملابس":
       cleanQuery: "ملابس", domain: "offer", filters: { category: "أزياء وملابس" }
   - النظام البرمجي سيقوم تلقائياً بإظهار بطاقات العروض والمنتجات والأماكن التفاعلية المباشرة تحت ردك، فلا تكتفِ أبداً بالنص المجرد أو إرسال الروابط فقط. وقس على ذلك باقي الطلبات والخدمات.

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
  "cleanQuery": "الاسم النظيف للبحث فقط أو null إذا كان سؤال استيضاح أو سؤال عام",
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
    { "label": "نص الزر الواضح", "path": "/المسار أو query:نص_البحث", "query": "اختياري عند الرغبة في إرسال استفسار مباشر" }
  ]
}`;

    let response: any = null;
    const aiConfig = {
      systemInstruction,
      responseMimeType: "application/json",
    };

    // Model candidate pool prioritizing supported Gemini models
    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];
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
