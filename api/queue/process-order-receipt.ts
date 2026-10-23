import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
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
    console.warn("Firebase Admin initialization error in order receipt queue:", err);
    return null;
  }
}

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
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // ignore
      }
    }

    const { orderId, businessId, totalPrice } = body || {};
    if (!orderId || !businessId) {
      return res.status(400).json({ error: 'بيانات الطلب غير مكتملة' });
    }

    const admin = getAdminApp();
    if (!admin) {
      return res.status(500).json({ error: 'خدمة الفايربيس غير متوفرة' });
    }

    const db = getAdminFirestore(admin);
    const bizRef = db.collection('businesses').doc(businessId);

    // Run synchronous Firestore transaction to ensure atomic updates to metrics
    await db.runTransaction(async (transaction) => {
      const bizDoc = await transaction.get(bizRef);
      if (bizDoc.exists) {
        const currentOrders = bizDoc.data()?.totalOrders || 0;
        const currentRevenue = bizDoc.data()?.totalRevenue || 0;
        transaction.update(bizRef, {
          totalOrders: currentOrders + 1,
          totalRevenue: currentRevenue + (Number(totalPrice) || 0)
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: 'تم تحديث إحصائيات المبيعات والطلبات للمحل بنجاح.'
    });
  } catch (err: any) {
    console.error("Error in order receipt serverless function:", err);
    return res.status(500).json({ error: err.message || "Failed to process order receipt" });
  }
}
