import type { IncomingMessage, ServerResponse } from 'http';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin SDK lazily
function initFirebaseAdmin() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      // Clean quotes and fix newline escape characters
      privateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    }

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      console.warn("Firebase Admin credentials not fully configured in environment variables.");
    }
  }
}

export default async function handler(req: any, res: any) {
  // Allow CORS if needed
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // ignore
      }
    }

    const { email } = body || {};

    if (!email) {
      res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
      return;
    }

    initFirebaseAdmin();
    if (!getApps().length) {
      res.status(500).json({ error: 'لم يتم تهيئة مفاتيح Firebase Admin بنجاح في الخادم.' });
      return;
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (!gmailUser || !gmailPass) {
      res.status(500).json({ error: 'بيانات اعتماد Gmail غير متوفرة في المتغيرات.' });
      return;
    }

    // 1. توليد رابط التحقق الأصلي من Firebase لاستخراج رمز الـ oobCode
    const rawLink = await getAuth().generateEmailVerificationLink(email);
    const parsedUrl = new URL(rawLink);
    const oobCode = parsedUrl.searchParams.get('oobCode');

    if (!oobCode) {
      res.status(500).json({ error: 'فشل استخراج كود التفعيل من Firebase' });
      return;
    }

    // 2. بناء رابط موقعك المباشر 100%
    const directVerifyUrl = `https://irbid-guide.vercel.app/verify?mode=verifyEmail&oobCode=${oobCode}`;

    // 3. تجهيز ناقل البريد
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    // 4. قالب إيميل عربي احترافي وأنيق
    const mailHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f6f2; margin: 0; padding: 20px; text-align: right; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e5e1da; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo-title { font-size: 26px; font-weight: 900; color: #1a4d2e; margin: 0; }
        .subtitle { font-size: 14px; color: #8c8275; margin-top: 5px; }
        .content { font-size: 16px; line-height: 1.8; color: #333333; margin-bottom: 35px; }
        .button-wrapper { text-align: center; margin: 35px 0; }
        .button { display: inline-block; background-color: #1a4d2e; color: #ffffff !important; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 36px; border-radius: 50px; }
        .footer { font-size: 12px; color: #a8a29e; text-align: center; border-top: 1px solid #f0eee9; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo-title">🏛️ شو في بإربد؟</h1>
          <div class="subtitle">دليلك الأول والمنصة الشاملة لمدينة إربد</div>
        </div>
        <div class="content">
          <p>أهلاً بك معنا،</p>
          <p>شكراً لانضمامك إلى مجتمع <strong>شو في بإربد؟</strong>. يرجى الضغط على الزر أدناه لتأكيد بريدك الإلكتروني والدخول مباشرة إلى حسابك:</p>
          <div class="button-wrapper">
            <a href="${directVerifyUrl}" class="button" target="_blank">تأكيد البريد الإلكتروني الآن</a>
          </div>
          <p style="font-size: 13px; color: #666;">إذا لم يعمل الزر معك، يمكنك نسخ الرابط التالي ولصقه في المتصفح مباشرة:<br>
          <a href="${directVerifyUrl}" style="color: #1a4d2e; word-break: break-all;">${directVerifyUrl}</a></p>
        </div>
        <div class="footer">
          إذا لم تقم بإنشاء حساب في دليل إربد، يمكنك تجاهل هذه الرسالة بأمان.
        </div>
      </div>
    </body>
    </html>
    `;

    await transporter.sendMail({
      from: `"شو في بإربد؟" <${gmailUser}>`,
      to: email,
      subject: 'تأكيد حسابك في منصة شو في بإربد؟ 🎉',
      html: mailHtml,
    });

    res.status(200).json({ success: true, message: 'تم إرسال إيميل التفعيل المباشر بنجاح' });
  } catch (error: any) {
    console.error("Error in /api/send-verification:", error);
    res.status(500).json({ error: error?.message || 'فشل إرسال إيميل التفعيل' });
  }
}
