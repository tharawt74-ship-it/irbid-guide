// In-memory rate limiting map for serverless execution
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();
const emailRateLimit = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(map: Map<string, { count: number; resetAt: number }>, key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = map.get(key);

  // Clean expired
  if (!record || now > record.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (record.count >= maxRequests) {
    return true;
  }

  record.count += 1;
  return false;
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
    // 1. IP & Email rate limiting check (Vercel & Container)
    const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
      .toString()
      .split(',')[0]
      .trim();

    // Max 5 requests per 15 minutes per IP
    if (isRateLimited(ipRateLimit, clientIp, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ 
        error: "تم إرسال عدد كبير من طلبات التحقق من هذا الجهاز. يرجى الانتظار 15 دقيقة قبل المحاولة مجدداً." 
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

    const { email, token, displayName } = body || {};
    if (!email || !token) {
      return res.status(400).json({ error: "Email and token are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 100) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Token format check: hexadecimal string (20-64 chars)
    const cleanToken = String(token).trim();
    if (!/^[a-f0-9]{20,64}$/i.test(cleanToken)) {
      return res.status(400).json({ error: "Invalid token format" });
    }

    // Max 3 requests per 15 minutes per recipient email address
    if (isRateLimited(emailRateLimit, cleanEmail, 3, 15 * 60 * 1000)) {
      return res.status(429).json({ 
        error: "تم إرسال رابط التفعيل إلى هذا البريد مؤخراً. يرجى مراجعة صندوق الوارد والبريد غير الهام (Spam) أو الانتظار قليلاً." 
      });
    }

    const safeDisplayName = displayName ? String(displayName).slice(0, 60).replace(/[<>]/g, '') : cleanEmail.split('@')[0];

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not defined in environment variables");
      return res.status(500).json({ error: "Email service not configured on server (missing RESEND_API_KEY)" });
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
        <h2>أهلاً بك يا ${displayName || 'عزيزنا المشترك'}، 👋</h2>
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

    return res.status(200).json({ success: true, messageId: resData.id });
  } catch (err: any) {
    console.error("Error in send-verification route:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
