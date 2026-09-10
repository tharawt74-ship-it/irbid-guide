import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { GoogleGenAI } from "@google/genai";
import rateLimit from "express-rate-limit";

dotenv.config();

// Lazy initialized Gemini AI instance
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Lazy initialized Firebase Admin instance
let adminApp: any = null;

function getAdminApp() {
  if (adminApp) return adminApp;

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = getApp();
      return adminApp;
    }

    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'irbid-7f4dd';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (clientEmail && privateKey) {
      // Clean private key: remove surrounding quotes and replace escaped \n with actual newlines
      privateKey = privateKey.trim();
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        })
      });
      return adminApp;
    }

    // Ambient Google Cloud / AI Studio preview initialization
    adminApp = initializeApp({
      projectId
    });
    return adminApp;
  } catch (err) {
    console.warn("Firebase Admin initialization error:", err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 🛡️ Security Headers & Server Hardening 🛡️
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking by allowing framing only from the same origin
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Enable XSS filtering in browsers that support it
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Control referrer information leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Enforce HTTPS transmission via HSTS (1 year)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Restrict browser features and sensors
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    next();
  });

  // Helper function for strict HTML & string sanitization
  const sanitizeInput = (str: unknown, maxLength = 200): string => {
    if (typeof str !== 'string') return '';
    return str
      .trim()
      .slice(0, maxLength)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  };

  const isValidEmail = (email: unknown): boolean => {
    if (typeof email !== 'string') return false;
    const trimmed = email.trim();
    return trimmed.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  };

  // 🛡️ Rate Limiting Configuration 🛡️
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: { error: 'تم تجاوز الحد المسموح به للطلبات، يرجى المحاولة لاحقاً.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 auth-related requests per hour
    message: { error: 'تم تجاوز الحد المسموح به من الطلبات. يرجى المحاولة لاحقاً.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 AI requests per hour
    message: { error: 'تم تجاوز الحد المسموح به للرسائل. يرجى المحاولة بعد قليل.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Trust proxy if running behind a load balancer/reverse proxy (Cloud Run environment)
  app.set('trust proxy', 1);

  // Apply general API rate limiter to all API routes
  app.use("/api/", apiLimiter);

  // Apply specific rate limiters to sensitive endpoints
  app.use("/api/auth/", authLimiter);
  app.use("/api/ai/", aiLimiter);

  app.use(express.json());

  // API Route for custom Resend verification email
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const rawEmail = req.body?.email;
      const rawToken = req.body?.token;
      const rawDisplayName = req.body?.displayName;

      if (!isValidEmail(rawEmail)) {
        return res.status(400).json({ error: "عنوان بريد إلكتروني غير صالح" });
      }

      if (typeof rawToken !== 'string' || !rawToken.trim() || rawToken.length > 256) {
        return res.status(400).json({ error: "رمز التحقق غير صالح أو مفقود" });
      }

      const email = rawEmail.trim().toLowerCase();
      const token = encodeURIComponent(rawToken.trim());
      const safeDisplayName = sanitizeInput(rawDisplayName || 'المستخدم الكريم', 60);

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error("RESEND_API_KEY is not defined in environment variables");
        return res.status(500).json({ error: "Email service not configured on server" });
      }

      // Build the verification link pointing back to our /verify route
      const verifyUrl = `${req.protocol}://${req.get('host')}/verify?token=${token}`;

      const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تفعيل حسابك في منصة شو في بإربد؟</title>
  <style>
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      background-color: #faf9f6;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #faf9f6;
      padding: 40px 15px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 32px;
      border: 1px solid #e8e4db;
      box-shadow: 0 10px 30px rgba(26,77,46,0.04);
      overflow: hidden;
    }
    .header {
      background-color: #1a4d2e;
      background-image: linear-gradient(135deg, #1a4d2e 0%, #11351e 100%);
      padding: 45px 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header p {
      color: #ff9f1c;
      margin: 8px 0 0 0;
      font-size: 14px;
      font-weight: 700;
    }
    .security-badge {
      display: inline-block;
      background-color: rgba(255, 159, 28, 0.1);
      color: #ff9f1c;
      padding: 6px 16px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 800;
      margin-top: 15px;
      border: 1px solid rgba(255, 159, 28, 0.2);
    }
    .content {
      padding: 45px 40px;
      text-align: right;
    }
    .content h2 {
      color: #242220;
      font-size: 22px;
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .content p {
      color: #5d5a55;
      font-size: 15px;
      line-height: 1.8;
      margin-bottom: 25px;
    }
    .btn-container {
      text-align: center;
      margin: 40px 0;
    }
    .btn {
      display: inline-block;
      background: #1a4d2e;
      background: linear-gradient(135deg, #1a4d2e 0%, #133b22 100%);
      color: #ffffff !important;
      text-decoration: none !important;
      padding: 16px 48px;
      font-size: 15px;
      font-weight: 800;
      border-radius: 20px;
      box-shadow: 0 6px 20px rgba(26,77,46,0.25);
      transition: all 0.3s ease;
    }
    .note-box {
      background-color: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 20px;
      padding: 20px 25px;
      margin-top: 30px;
    }
    .note-box p {
      color: #b45309;
      font-size: 13px;
      margin: 0;
      line-height: 1.7;
    }
    .footer {
      background-color: #fbfbfa;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #e8e4db;
    }
    .footer p {
      color: #a5a29e;
      font-size: 12px;
      margin: 6px 0;
      font-weight: 500;
    }
    .footer a {
      color: #1a4d2e;
      text-decoration: none;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>شو في بإربد؟ 🗺️</h1>
        <p>دليلك الرقمي الأسرع للمحلات، الوظائف، والعروض</p>
        <div class="security-badge">تفعيل موثق للأمان</div>
      </div>

      <div class="content">
        <h2>أهلاً بك يا ${safeDisplayName}، 👋</h2>
        <p>
          لقد قمت بإنشاء حسابك الجديد بنجاح في <strong>منصة شو في بإربد؟</strong>. لتأكيد ملكيتك للبريد الإلكتروني وتنشيط حسابك بالكامل، يرجى الضغط على رابط التفعيل المباشر والآمن أدناه:
        </p>

        <div class="btn-container">
          <a href="${verifyUrl}" class="btn" target="_blank">تأكيد وتفعيل الحساب فوراً ⚡</a>
        </div>

        <div class="note-box">
          <p>
            <strong>💡 نصيحة هامة:</strong> بمجرد ضغطك على الزر أعلاه، سيتم تأكيد حسابك وسيفتح لك الموقع تلقائياً دون الحاجة لإعادة كتابة كلمة المرور!
          </p>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #a5a29e; text-align: center;">
          إذا لم تقم بطلب التسجيل في منصتنا، يمكنك إهمال وحذف هذه الرسالة بأمان.
        </p>
      </div>

      <div class="footer">
        <p>© 2026 جميع الحقوق محفوظة لـ <strong>منصة شو في بإربد؟</strong></p>
        <p>تصفح الموقع الإلكتروني: <a href="https://shofibirbid.site" target="_blank">shofibirbid.site</a></p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "منصة شو في بإربد؟ <no-reply@shofibirbid.site>",
          to: [email],
          subject: "تفعيل حسابك في منصة شو في بإربد؟ 🗺️",
          html: htmlContent
        })
      });

      const resData: any = await response.json();
      if (!response.ok) {
        console.error("Resend API error:", resData);
        return res.status(response.status).json({ error: resData.message || "Failed to send email via Resend" });
      }

      return res.json({ success: true, messageId: resData.id });
    } catch (err: any) {
      console.error("Error in send-verification route:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // API Route for custom Resend password reset email
  app.post("/api/auth/send-password-reset", async (req, res) => {
    try {
      const rawEmail = req.body?.email;
      if (!isValidEmail(rawEmail)) {
        return res.status(400).json({ error: "عنوان بريد إلكتروني غير صالح" });
      }

      const email = rawEmail.trim().toLowerCase();

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return res.status(500).json({ error: "Email service not configured on server" });
      }

      let oobCode: string | null = null;
      let authErrorDetails = "";

      // 1. Try using Firebase Admin SDK
      const app = getAdminApp();
      if (app) {
        try {
          const authAdmin = getAuth(app);
          const oobLink = await authAdmin.generatePasswordResetLink(email);
          const urlParams = new URL(oobLink).searchParams;
          oobCode = urlParams.get('oobCode');
        } catch (err: any) {
          console.warn("Admin SDK failed to generate reset link locally, trying REST API:", err);
          authErrorDetails = err.message || "";
        }
      }

      // 2. Fall back to REST API
      if (!oobCode) {
        const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY || "AIzaSyDDswaCceyey9mjAC7ERlkPQ0dIkNsbquw";
        const oobResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email: email,
            returnOobLink: true
          })
        });

        const oobData: any = await oobResponse.json();
        if (!oobResponse.ok) {
          console.error("Firebase sendOobCode error:", oobData);
          const errMessage = oobData.error?.message || "Failed to generate password reset code";
          return res.status(oobResponse.status).json({ error: errMessage });
        }

        const oobLink = oobData.oobLink;
        const urlParams = new URL(oobLink).searchParams;
        oobCode = urlParams.get('oobCode');
      }

      if (!oobCode) {
        return res.status(500).json({ error: "Failed to generate password reset code. " + authErrorDetails });
      }

      // Build custom reset URL pointing to our app
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?oobCode=${oobCode}`;

      // Elegant, super-premium HTML content for Password Reset
      const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إعادة تعيين كلمة المرور - منصة شو في بإربد؟</title>
  <style>
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      background-color: #faf9f6;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #faf9f6;
      padding: 40px 15px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 32px;
      border: 1px solid #e8e4db;
      box-shadow: 0 10px 30px rgba(26,77,46,0.045);
      overflow: hidden;
    }
    .header {
      background-color: #1a4d2e;
      background-image: linear-gradient(135deg, #1a4d2e 0%, #11351e 100%);
      padding: 45px 30px;
      text-align: center;
      position: relative;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header p {
      color: #ff9f1c;
      margin: 8px 0 0 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .security-badge {
      display: inline-block;
      background-color: rgba(255, 159, 28, 0.1);
      color: #ff9f1c;
      padding: 6px 16px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 800;
      margin-top: 15px;
      border: 1px solid rgba(255, 159, 28, 0.2);
    }
    .content {
      padding: 45px 40px;
      text-align: right;
    }
    .content h2 {
      color: #242220;
      font-size: 22px;
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .content p {
      color: #5d5a55;
      font-size: 15px;
      line-height: 1.8;
      margin-bottom: 25px;
    }
    .btn-container {
      text-align: center;
      margin: 40px 0;
    }
    .btn {
      display: inline-block;
      background: #1a4d2e;
      background: linear-gradient(135deg, #1a4d2e 0%, #133b22 100%);
      color: #ffffff !important;
      text-decoration: none !important;
      padding: 16px 48px;
      font-size: 15px;
      font-weight: 800;
      border-radius: 20px;
      box-shadow: 0 6px 20px rgba(26,77,46,0.25);
      transition: all 0.3s ease;
    }
    .warning-box {
      background-color: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 20px;
      padding: 20px 25px;
      margin-top: 30px;
    }
    .warning-box p {
      color: #b45309;
      font-size: 13px;
      margin: 0;
      line-height: 1.7;
    }
    .footer {
      background-color: #fbfbfa;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #e8e4db;
    }
    .footer p {
      color: #a5a29e;
      font-size: 12px;
      margin: 6px 0;
      font-weight: 500;
    }
    .footer a {
      color: #1a4d2e;
      text-decoration: none;
      font-weight: 700;
    }
    .lock-icon {
      font-size: 40px;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="lock-icon">🔒</div>
        <h1>إعادة تعيين كلمة المرور</h1>
        <p>منصة شو في بإربد؟</p>
        <div class="security-badge">طلب أمان موثق</div>
      </div>

      <div class="content">
        <h2>أهلاً بك، 👋</h2>
        <p>
          لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong>منصة شو في بإربد؟</strong> والمرتبط بالبريد الإلكتروني (<strong>${email}</strong>). لتغيير كلمة المرور الخاصة بك واختيار كلمة مرور جديدة، يرجى الضغط على الزر المباشر والآمن أدناه:
        </p>

        <div class="btn-container">
          <a href="${resetUrl}" class="btn" target="_blank">إعادة تعيين كلمة المرور الآن 🔑</a>
        </div>

        <div class="warning-box">
          <p>
            <strong>⚠️ ملاحظة أمنية هامة:</strong> إذا لم تكن أنت من طلب إعادة تعيين كلمة المرور هذه، يمكنك تجاهل هذا البريد الإلكتروني بأمان تام. لن يطرأ أي تغيير على كلمة مرورك الحالية دون النقر على الرابط وتأكيده.
          </p>
        </div>
      </div>

      <div class="footer">
        <p>صلاحية هذا الرابط هي ساعة واحدة فقط لدواعي الأمان المتقدمة.</p>
        <p>© 2026 جميع الحقوق محفوظة لـ <strong>منصة شو في بإربد؟</strong></p>
        <p><a href="https://shofibirbid.site" target="_blank">shofibirbid.site</a></p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      const sendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "منصة شو في بإربد؟ <no-reply@shofibirbid.site>",
          to: [email],
          subject: "إعادة تعيين كلمة المرور - منصة شو في بإربد؟ 🔑",
          html: htmlContent
        })
      });

      const sendData: any = await sendResponse.json();
      if (!sendResponse.ok) {
        console.error("Resend API send error:", sendData);
        return res.status(sendResponse.status).json({ error: sendData.message || "Failed to send reset email" });
      }

      return res.json({ success: true, messageId: sendData.id });
    } catch (err: any) {
      console.error("Error in reset password route:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // API Route for AI Site Assistant (Gemini 2.5 Flash - 100% Free Tier)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const rawMessage = req.body?.message;
      if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Limit message length to 1000 characters to prevent buffer overflow & token exhaustion attacks
      const message = rawMessage.trim().slice(0, 1000);

      const client = getGeminiClient();
      if (!client) {
        // Signal fallback to instant built-in client engine
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
          response = await client.models.generateContent({
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

      const textOutput = response.text || "{}";
      let parsedData = { text: "عذراً، حدث خطأ في معالجة طلبك.", actions: [] };
      
      try {
        parsedData = JSON.parse(textOutput);
      } catch (parseErr) {
        // If AI returns raw text instead of JSON despite instructions
        parsedData.text = textOutput;
      }

      return res.json(parsedData);
    } catch {
      // Return seamless fallback on any server error
      return res.status(200).json({ fallback: true });
    }
  });

  // Vite middleware for development
  let vite: any = null;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });

  const cleanup = async () => {
    if (vite) {
      try {
        await vite.close();
      } catch {
        // ignore
      }
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

startServer();
