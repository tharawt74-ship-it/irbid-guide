import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

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

    adminApp = initializeApp({
      projectId
    });
    return adminApp;
  } catch (err) {
    console.warn("Firebase Admin initialization error in broadcast queue:", err);
    return null;
  }
}

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

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'غير مصرح: رمز الجلسة مفقود' });
    }
    const token = authHeader.split(' ')[1];

    const admin = getAdminApp();
    if (!admin) {
      return res.status(500).json({ error: 'خدمة الفايربيس غير متوفرة حالياً' });
    }

    const authAdmin = getAuth(admin);
    const decodedToken = await authAdmin.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = (decodedToken.email || "").toLowerCase().trim();

    const db = getAdminFirestore(admin);
    const adminDoc = await db.collection('admins').doc(uid).get();
    const supervisorDoc = await db.collection('supervisors').doc(uid).get();

    const allowedEmails = [
      "princessofx2344@gmail.com"
    ];
    const isEmailAdmin = allowedEmails.includes(email);

    if (!adminDoc.exists && !supervisorDoc.exists && !isEmailAdmin) {
      return res.status(403).json({ error: 'عذراً، لا تملك صلاحيات مسؤول النظام للبث' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // ignore
      }
    }

    const { title, body: msgBody, targetGroup, extraData } = body || {};
    if (!title || !msgBody) {
      return res.status(400).json({ error: 'عنوان ومحتوى الإشعار مطلوبة' });
    }

    // 1. Fetch tokens for push dispatch (FCM)
    const deviceTokensSnap = await db.collection('deviceTokens').get();
    const tokens: string[] = [];
    deviceTokensSnap.forEach(doc => {
      const data = doc.data();
      if (data.token) tokens.push(data.token);
    });

    // 2. Write app notification record to Firestore
    await db.collection('notifications').add({
      title: sanitizeInput(title, 150),
      message: sanitizeInput(msgBody, 500),
      createdAt: Date.now(),
      type: targetGroup || 'general',
      extraData: extraData || {},
      sentByAdmin: uid
    });

    // 3. Log the action in Audit Logs
    await db.collection('auditLogs').add({
      action: 'BROADCAST_NOTIFICATION_PROCESSED',
      performedBy: email || uid,
      details: `تم معالجة بث جماعي لعدد ${tokens.length} جهاز بنجاح.`,
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
    });

    return res.status(200).json({
      success: true,
      message: 'تمت معالجة البث وتسجيل الإشعار وخط السجل بنجاح.',
      devicesCount: tokens.length
    });
  } catch (err: any) {
    console.error("Error in broadcast serverless function:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
