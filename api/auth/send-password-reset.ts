import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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
      // 1. Clean whitespace
      privateKey = privateKey.trim();

      // 2. Strip surrounding quotes if present
      if (
        (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))
      ) {
        privateKey = privateKey.slice(1, -1).trim();
      }

      // 3. Replace escaped \n with actual newlines
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

export default async function handler(req: any, res: any) {
  // Allow OPTIONS preflight request for CORS if needed
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // ignore JSON parse error
      }
    }

    const { email } = body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required", message: "البريد الإلكتروني مطلوب" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not defined in environment variables");
      return res.status(500).json({ 
        error: "Email service not configured", 
        message: "لم يتم ضبط متغير RESEND_API_KEY في إعدادات البيئة على Vercel." 
      });
    }

    let oobCode: string | null = null;
    let authErrorDetails = "";
    let isUserNotFound = false;

    // 1. Try using the Firebase Admin SDK (authorized/administrative privileges)
    const app = getAdminApp();
    if (app) {
      try {
        const authAdmin = getAuth(app);
        const oobLink = await authAdmin.generatePasswordResetLink(cleanEmail);
        const urlParams = new URL(oobLink).searchParams;
        oobCode = urlParams.get('oobCode');
      } catch (err: any) {
        console.warn("Admin SDK failed to generate reset link:", err);
        authErrorDetails = err.message || "";
        const code = err.code || '';
        if (
          code === 'auth/user-not-found' ||
          authErrorDetails.includes('user-not-found') ||
          authErrorDetails.includes('no user record')
        ) {
          isUserNotFound = true;
        }
      }
    }

    if (isUserNotFound) {
      return res.status(404).json({
        error: "user-not-found",
        message: "لم نجد حساباً مسجلاً بهذا البريد الإلكتروني في المنصة."
      });
    }

    // 2. Fall back to Google Identity Toolkit REST API (if Admin SDK is not initialized or fails)
    if (!oobCode) {
      const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY || "AIzaSyDDswaCceyey9mjAC7ERlkPQ0dIkNsbquw";
      const oobResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email: cleanEmail,
          returnOobLink: true
        })
      });

      const oobData: any = await oobResponse.json();
      if (!oobResponse.ok) {
        console.error("Firebase sendOobCode error:", oobData);
        const errMessage = oobData.error?.message || "Failed to generate password reset code";
        
        if (errMessage.includes("EMAIL_NOT_FOUND") || errMessage.includes("USER_NOT_FOUND")) {
          return res.status(404).json({
            error: "user-not-found",
            message: "لم نجد حساباً مسجلاً بهذا البريد الإلكتروني في المنصة."
          });
        }

        if (errMessage.includes("INSUFFICIENT_PERMISSION")) {
          return res.status(400).json({ 
            error: "INSUFFICIENT_PERMISSION",
            message: "الرجاء التأكد من صحة مفتاح FIREBASE_PRIVATE_KEY و FIREBASE_CLIENT_EMAIL في إعدادات Vercel." 
          });
        }
        return res.status(oobResponse.status).json({ error: errMessage, message: errMessage });
      }

      const oobLink = oobData.oobLink;
      const urlParams = new URL(oobLink).searchParams;
      oobCode = urlParams.get('oobCode');
    }

    if (!oobCode) {
      return res.status(500).json({ 
        error: "Failed to generate password reset code", 
        message: authErrorDetails || "تعذر توليد رمز إعادة تعيين كلمة المرور." 
      });
    }

    // Build custom reset URL pointing to our app
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const resetUrl = `${protocol}://${host}/reset-password?oobCode=${oobCode}`;

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
      box-shadow: 0 10px 30px rgba(26,77,46,0.04);
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
          لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong>منصة شو في بإربد؟</strong> والمرتبط بالبريد الإلكتروني (<strong>${cleanEmail}</strong>). لتغيير كلمة المرور الخاصة بك واختيار كلمة مرور جديدة، يرجى الضغط على الزر المباشر والآمن أدناه:
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

    // Try primary sender domain first
    let sendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "منصة شو في بإربد؟ <no-reply@shofibirbid.site>",
        to: [cleanEmail],
        subject: "إعادة تعيين كلمة المرور - منصة شو في بإربد؟ 🔑",
        html: htmlContent
      })
    });

    let sendData: any = await sendResponse.json().catch(() => ({}));

    // If sending from custom domain failed (e.g. domain not verified yet on Resend), retry with onboarding@resend.dev
    if (
      !sendResponse.ok &&
      (sendData?.message?.includes("domain") ||
        sendData?.message?.includes("verify") ||
        sendData?.name === "validation_error")
    ) {
      console.warn("Resend custom domain not verified yet, falling back to onboarding@resend.dev:", sendData);
      sendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "منصة شو في بإربد؟ <onboarding@resend.dev>",
          to: [cleanEmail],
          subject: "إعادة تعيين كلمة المرور - منصة شو في بإربد؟ 🔑",
          html: htmlContent
        })
      });
      sendData = await sendResponse.json().catch(() => ({}));
    }

    if (!sendResponse.ok) {
      console.error("Resend API send error:", sendData);
      return res.status(sendResponse.status || 500).json({ 
        error: sendData.message || "Failed to send reset email via Resend",
        message: sendData.message || "فشل إرسال البريد الإلكتروني عبر خدمة Resend. يرجى التحقق من إعدادات Resend."
      });
    }

    return res.status(200).json({ success: true, messageId: sendData.id });
  } catch (err: any) {
    console.error("Error in reset password route:", err);
    return res.status(500).json({ 
      error: err.message || "Internal server error", 
      message: err.message || "حدث خطأ غير متوقع في الخادم." 
    });
  }
}
