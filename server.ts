import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

dotenv.config();

// Initialize Firebase Admin dynamically to avoid startup crashes in different environments
let adminApp: any = null;
try {
  const existingApps = getApps();
  if (existingApps.length === 0) {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        })
      });
    } else {
      // Automatically uses ambient Google Cloud Run / AI Studio preview credentials
      adminApp = initializeApp();
    }
  } else {
    adminApp = getApp();
  }
} catch (err) {
  console.warn("Firebase Admin failed to initialize. Falling back to standard REST API:", err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for custom Resend verification email
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { email, token, displayName } = req.body;
      if (!email || !token) {
        return res.status(400).json({ error: "Email and token are required" });
      }

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
        <h2>أهلاً بك يا ${displayName}، 👋</h2>
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
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return res.status(500).json({ error: "Email service not configured on server" });
      }

      let oobCode: string | null = null;
      let authErrorDetails = "";

      // 1. Try using Firebase Admin SDK
      if (adminApp) {
        try {
          const authAdmin = getAuth(adminApp);
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
