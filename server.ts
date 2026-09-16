import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
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

  // Enforce HTTPS in production
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });

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

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

  // Server-side in-memory cache for lightning-fast system settings delivery
  let cachedSystemSettings: any = null;
  let cachedSystemSettingsTime = 0;
  const SYSTEM_SETTINGS_TTL = 30 * 1000; // 30 seconds cache

  // API Route for getting and setting system config with Admin bypass rules
  app.get("/api/system-settings", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');

      if (cachedSystemSettings && (Date.now() - cachedSystemSettingsTime < SYSTEM_SETTINGS_TTL)) {
        return res.json({ success: true, settings: cachedSystemSettings });
      }

      const appInstance = getAdminApp();
      if (!appInstance) {
        return res.status(500).json({ error: "Firebase Admin not initialized" });
      }
      const adminDb = getAdminFirestore(appInstance);
      const docRef = adminDb.collection("systemConfig").doc("settings");
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        // Sanitize if huge base64 was sent
        if (data?.globalSettings?.logoUrl?.startsWith('data:image')) {
          data.globalSettings.logoUrl = '/logo.png';
        }
        cachedSystemSettings = data;
        cachedSystemSettingsTime = Date.now();
        return res.json({ success: true, settings: data });
      } else {
        return res.json({ success: true, settings: null });
      }
    } catch (err: any) {
      console.error("Error reading system settings server-side:", err);
      return res.status(500).json({ error: err.message || "Failed to load system settings" });
    }
  });

  app.post("/api/system-settings", async (req, res) => {
    try {
      const appInstance = getAdminApp();
      if (!appInstance) {
        return res.status(500).json({ error: "Firebase Admin not initialized" });
      }
      
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing token" });
      }
      
      const token = authHeader.split(" ")[1];
      const authAdmin = getAuth(appInstance);
      const decodedToken = await authAdmin.verifyIdToken(token);
      const uid = decodedToken.uid;
      const email = (decodedToken.email || "").toLowerCase().trim();
      
      const adminDb = getAdminFirestore(appInstance);
      
      const ADMIN_BOOTSTRAP_EMAILS = [
        'princessofx2344@gmail.com',
        'admin@shoofiirbid.com',
        'irbid.admin@gmail.com',
        'tharawt74@gmail.com'
      ];
      
      let isAdmin = ADMIN_BOOTSTRAP_EMAILS.map(e => e.toLowerCase().trim()).includes(email);
      
      if (!isAdmin) {
        const adminDoc = await adminDb.collection("admins").doc(uid).get();
        if (adminDoc.exists) {
          isAdmin = true;
        }
      }
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: You are not authorized as an administrator" });
      }
      
      const newSettings = req.body;
      const docRef = adminDb.collection("systemConfig").doc("settings");
      const cleanedSettings = JSON.parse(JSON.stringify(newSettings));
      
      await docRef.set(cleanedSettings, { merge: true });
      if (cleanedSettings?.globalSettings?.enableAiAssistant !== undefined) {
        try {
          await adminDb.collection("settings").doc("appConfig").set({
            enableAiAssistant: cleanedSettings.globalSettings.enableAiAssistant
          }, { merge: true });
        } catch (e) {
          console.warn("Could not sync appConfig with system settings:", e);
        }
      }
      cachedSystemSettings = { ...cachedSystemSettings, ...cleanedSettings };
      cachedSystemSettingsTime = Date.now();
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Error saving system settings server-side:", err);
      return res.status(500).json({ error: err.message || "Failed to save system settings" });
    }
  });

  // API Route for AI Site Assistant (Gemini 3.8 Flash & Fallbacks)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      if (cachedSystemSettings && cachedSystemSettings.globalSettings?.enableAiAssistant === false) {
        return res.status(403).json({ error: "المساعد الذكي معطل حالياً من قبل إدارة المنصة", disabled: true });
      }

      // Live verification with Firestore
      const appInst = getAdminApp();
      if (appInst) {
        try {
          const aDb = getAdminFirestore(appInst);
          const snap = await aDb.collection("systemConfig").doc("settings").get();
          if (snap.exists && snap.data()?.globalSettings?.enableAiAssistant === false) {
            return res.status(403).json({ error: "المساعد الذكي معطل حالياً من قبل إدارة المنصة", disabled: true });
          }
          const appConfigSnap = await aDb.collection("settings").doc("appConfig").get();
          if (appConfigSnap.exists && appConfigSnap.data()?.enableAiAssistant === false) {
            return res.status(403).json({ error: "المساعد الذكي معطل حالياً من قبل إدارة المنصة", disabled: true });
          }
        } catch (e) {
          console.warn("Firestore live check warning in /api/ai/chat:", e);
        }
      }

      const rawMessage = req.body?.message;
      const history = Array.isArray(req.body?.history) ? req.body.history : [];
      if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Limit message length to 1000 characters
      const message = rawMessage.trim().slice(0, 1000);

      const client = getGeminiClient();
      if (!client) {
        return res.status(200).json({ fallback: true });
      }

      const systemInstruction = `أنت "ربداوي الأصلي" 🤖🇯🇴 - الخبير الذكي الأول والمستشار الرقمي المحلي لكل من ينقب أو يسأل عن شو في بإربد! (shofibirbid.site).

شروط اللهجة والأسلوب (صارمة جداً ومندوبة):
1. يجب أن تتحدث وتجيب **حصراً وبشكل كامل باللهجة الأردنية الإربدية اللطيفة والمحببة للقلب** (مثال: "هلا وغلا قرابة!", "أبشر يا غالي هسا بطلّعلك الصافي من الدليل!", "شوف يا بعدي شو لقيتلك بإربد:", "بدك رخيص وإلا إشي فاخر؟", "يسعد قلبك!", "هسا بفحصلك المحلات والشغالين هسا"، "تأمر أمر يا كبير!", "ولا يهمك، جيت على الشخص الصح!").
2. يمنع منعاً باتاً استخدام اللغة الفصحى المعقدة أو الجمل الآلية الجافة. خلك ابن البلد العارف بكل شبر بإربد (شارع الجامعة، شارع الثلاثين، اليرموك، التكنو، جدارا، إيدون، الحصن، حوارة، بيت راس، الكورة، أم قيس، ومجمعات النقل).
3. خليك سريع البديهة، خفيف الدم، وخدوم جداً.

قواعد صارمة جداً لتراكم السياق وتتابع الشات (Multi-Turn Context Continuity):
- اقرأ الرسائل السابقة في المحادثة أولاً بتمعن! المحادثة مستمرة وليست رسائل منفصلة.
- إذا كان الزائر يتحدث في الرسائل السابقة عن **البحث عن عمل أو وظائف** (domain: "job")، وكتب في رسالته الجديدة تخصيصاً مثل "كافتيريا" أو "مطعم" أو "مبيعات" أو "كاشير" أو "دوام جزئي" -> **يجب أن تظل في مجال الوظائف domain: "job"**، وتستخرج الكلمة النقية cleanQuery = "كافتيريا". (يمنع منعاً باتاً تحويل المجال إلى محلات تجارية business وإظهار بطاقات محلات كافتيريا عندما يطلب الزائر وظيفة كافتيريا!).
- إذا كان الزائر يتحدث سابقاً عن **السكنات أو الشقق** (domain: "housing") وكتب "شارع الجامعة" أو "طالبات" -> **احفظ المجال domain: "housing"**.
- لا تقم بتغيير المجال إلا إذا غير الزائر الموضوع صراحةً (مثال: "طيب شو أكل شاورما الحين؟").

قواعد فهم الكلمات والمترادفات الأردنية (Dialect & Category Mapping):
- "أواعي" / "أواعي بناتي" / "ألبسة" / "بوتيكات" / "فستان" / "موضة" -> تعني قطاع **أزياء وملابس** (category: "أزياء وملابس"). استخرج cleanQuery = "ملابس" أو الكلمة المطلوبة مع الفئة "أزياء وملابس". لا تفترض أبداً أن الزائر يبحث عن محل اسمه الحرفي "ملابس"! بل عن محلات تبيع الملابس والأواعي!
- "شغل" / "بدور ع شغل" / "في شغل" / "بدي أشتغل" -> مجال الوظائف (domain: "job").
- "سكن" / "شقة" / "استوديو" / "بيت للإيجار" -> مجال السكنات (domain: "housing").
- "أكل" / "زاكي" / "جيعان" / "عشا" / "غدا" -> مجال المطاعم والمأكولات.
- "أراجيل" / "قهوة" / "قعدة حلوة" -> مجال الكافيهات والمقاهي.

تصنيف النية واستخراج البيانات:
- إذا كان السؤال عن أي مكان، مطعم، كافيه، وجبة، شاورما، صيدلية، سكن، شقة، وظيفة، عرض، خط باص، مواقيت صلاة، أو سياحة:
  * استخرج الكلمة الصافية المستهدفة في cleanQuery (مثل: "كافتيريا", "شاورما", "كافيه", "سكن طالبات", "كاشير", "ملابس").
  * حدد domain المناسب ("business" | "housing" | "job" | "product" | "offer" | "tourism" | "none").
  * حدد الفلاتر المنظمة (openNow, closedNow, lowPrice, highRating, maxPrice, category, location, university, targetType, jobType).
  * اقترح أزرار مسارات مفيدة في actions عند الحاجة (/search, /housing, /jobs, /offers, /prayer-times, /transportation, /tourism).
  * توليد 2-3 اقتراحات متابعة ذكية باللهجة الأردنية في suggestedPrompts.

يجب أن يكون ردك بصيغة JSON صحيحة تماماً بالشكل التالي فقط:
{
  "text": "نص الرد المحبوب والذكي والواضح بالكامل باللهجة الأردنية الإربدية مع إيموجيز مناسبة",
  "cleanQuery": "الكلمة النقية للبحث فقط في قواعد البيانات أو null للأسئلة العامة",
  "domain": "business | housing | job | product | offer | tourism | none",
  "filters": {
    "openNow": false,
    "closedNow": false,
    "lowPrice": false,
    "highRating": false,
    "minRating": null,
    "maxPrice": null,
    "category": null,
    "location": null,
    "university": null,
    "targetType": null,
    "jobType": null,
    "sortBy": "relevance"
  },
  "actions": [
    { "label": "نص الزر الأردني اللطيف", "path": "/المسار" }
  ],
  "suggestedPrompts": [
    "اقتراح أردني 1",
    "اقتراح أردني 2"
  ]
}`;

      // Build contents with conversation history
      const formattedContents: any[] = [];
      
      if (Array.isArray(history) && history.length > 0) {
        // Take last 6 messages to keep context without exceeding limits
        const recentHistory = history.slice(-6);
        for (const item of recentHistory) {
          if (item && item.sender && item.text) {
            formattedContents.push({
              role: item.sender === 'user' ? 'user' : 'model',
              parts: [{ text: item.text }]
            });
          }
        }
      }

      // Append current user message
      formattedContents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      let response: any = null;
      const aiConfig = {
        systemInstruction,
        responseMimeType: "application/json",
      };

      // Model candidate pool with stable Gemini models
      const candidateModels = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
      for (const modelName of candidateModels) {
        try {
          response = await client.models.generateContent({
            model: modelName,
            contents: formattedContents,
            config: aiConfig
          });
          if (response && response.text) {
            break;
          }
        } catch (mErr: any) {
          // Log clean warning without breaking execution flow
          console.warn(`[AI API] Model ${modelName} temporary issue (${mErr?.status || mErr?.message || 'unavailable'}), trying fallback candidate...`);
        }
      }

      if (!response || !response.text) {
        return res.status(200).json({ fallback: true });
      }

      const textOutput = response.text || "{}";
      let parsedData: any = { text: "عذراً، حدث خطأ في معالجة طلبك.", actions: [] };
      
      try {
        parsedData = JSON.parse(textOutput);
      } catch {
        parsedData = {
          text: textOutput,
          cleanQuery: null,
          domain: "none",
          actions: [
            { label: '🏢 دليل المحلات والأنشطة', path: '/search' },
            { label: '🏷️ العروض والتخفيضات', path: '/offers' }
          ]
        };
      }

      return res.json(parsedData);
    } catch (err) {
      console.error("AI Chat Route Error:", err);
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
