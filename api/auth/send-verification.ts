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
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const verifyUrl = `${protocol}://${host}/verify?token=${token}`;

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
      padding: 30px 15px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      border: 1px solid #e5e1da;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      overflow: hidden;
    }
    .header {
      background-color: #1a4d2e;
      padding: 35px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .header p {
      color: #ff9f1c;
      margin: 5px 0 0 0;
      font-size: 13px;
      font-weight: 700;
    }
    .content {
      padding: 35px 30px;
      text-align: right;
    }
    .content h2 {
      color: #2d2a26;
      font-size: 20px;
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .content p {
      color: #55524e;
      font-size: 14px;
      line-height: 1.7;
      margin-bottom: 25px;
    }
    .btn-container {
      text-align: center;
      margin: 35px 0;
    }
    .btn {
      display: inline-block;
      background-color: #1a4d2e;
      color: #ffffff !important;
      text-decoration: none !important;
      padding: 14px 40px;
      font-size: 14px;
      font-weight: 800;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(26,77,46,0.2);
    }
    .note-box {
      background-color: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 16px;
      padding: 15px 20px;
      margin-top: 25px;
    }
    .note-box p {
      color: #b45309;
      font-size: 12px;
      margin: 0;
      line-height: 1.6;
    }
    .footer {
      background-color: #f6f5f2;
      padding: 25px 20px;
      text-align: center;
      border-top: 1px solid #e5e1da;
    }
    .footer p {
      color: #a19e9a;
      font-size: 11px;
      margin: 5px 0;
      font-weight: bold;
    }
    .footer a {
      color: #1a4d2e;
      text-decoration: none;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>شو في بإربد؟ 🗺️</h1>
        <p>دليلك الرقمي الأسرع للمحلات، الوظائف، والعروض</p>
      </div>

      <div class="content">
        <h2>أهلاً بك يا ${displayName}! 👋</h2>
        <p>
          لقد قمت بإنشاء حسابك الجديد بنجاح في <strong>منصة شو في بإربد؟</strong>. لتأكيد ملكيتك للبريد الإلكتروني وتنشيط الحساب، يرجى الضغط على رابط التفعيل المباشر والآمن أدناه:
        </p>

        <div class="btn-container">
          <a href="${verifyUrl}" class="btn" target="_blank">تأكيد وتفعيل الحساب فوراً ⚡</a>
        </div>

        <div class="note-box">
          <p>
            <strong>💡 نصيحة هامة:</strong> بمجرد ضغطك على الزر أعلاه، سيتم تأكيد حسابك وسيفتح لك الموقع تلقائياً دون الحاجة لإعادة كتابة كلمة المرور!
          </p>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #a19e9a; text-align: center;">
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

    return res.status(200).json({ success: true, messageId: resData.id });
  } catch (err: any) {
    console.error("Error in send-verification route:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
