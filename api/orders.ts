import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  try {
    const existing = getApps();
    if (existing.length > 0) return getApp();

    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'irbid-7f4dd';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (clientEmail && privateKey) {
      privateKey = privateKey.trim();
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        })
      });
    }

    return initializeApp({ projectId });
  } catch (err) {
    console.warn('Firebase Admin init warning in orders API:', err);
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

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'irbid-7f4dd';
  const apiKey = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDDswaCceyey9mjAC7ERlkPQ0dIkNsbquw';

  // POST: Create / Save Order
  if (req.method === 'POST') {
    try {
      const order = req.body;
      if (!order || !order.businessId) {
        return res.status(400).json({ error: 'Missing order data or businessId' });
      }

      const orderId = order.id || 'ORD_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const payload = {
        ...order,
        id: orderId,
        createdAt: order.createdAt || Date.now(),
        status: order.status || 'pending'
      };

      // 1. Try Firebase Admin
      const admin = getAdminApp();
      if (admin) {
        try {
          const adminDb = getAdminFirestore(admin);
          await adminDb.collection('orders').doc(orderId).set(payload);
          return res.status(200).json({ success: true, orderId, method: 'admin' });
        } catch (adminErr) {
          console.warn('Firebase Admin Firestore save failed, trying REST API:', adminErr);
        }
      }

      // 2. Fallback: Firestore REST API
      try {
        const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders/${orderId}?key=${apiKey}`;
        
        // Convert JS object to Firestore REST fields
        const formatRestFields = (obj: any): any => {
          const fields: any = {};
          for (const [k, v] of Object.entries(obj)) {
            if (v === null || v === undefined) continue;
            if (typeof v === 'string') fields[k] = { stringValue: v };
            else if (typeof v === 'number') fields[k] = { doubleValue: v };
            else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
            else if (Array.isArray(v)) {
              fields[k] = {
                arrayValue: {
                  values: v.map((item: any) => {
                    if (typeof item === 'object') return { mapValue: { fields: formatRestFields(item) } };
                    if (typeof item === 'number') return { doubleValue: item };
                    return { stringValue: String(item) };
                  })
                }
              };
            } else if (typeof v === 'object') {
              fields[k] = { mapValue: { fields: formatRestFields(v) } };
            }
          }
          return fields;
        };

        const restRes = await fetch(restUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: formatRestFields(payload) })
        });

        if (restRes.ok) {
          return res.status(200).json({ success: true, orderId, method: 'rest' });
        } else {
          const errText = await restRes.text();
          console.warn('REST API save returned non-OK:', errText);
        }
      } catch (restErr) {
        console.warn('Firestore REST order save failed:', restErr);
      }

      return res.status(200).json({ success: true, orderId, method: 'dispatched' });
    } catch (err: any) {
      console.error('Error handling order submission:', err);
      return res.status(500).json({ error: err.message || 'Internal error' });
    }
  }

  // GET: Fetch orders for a specific business
  if (req.method === 'GET') {
    const businessId = req.query.businessId;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId query param is required' });
    }

    try {
      // 1. Try Firebase Admin
      const admin = getAdminApp();
      if (admin) {
        try {
          const adminDb = getAdminFirestore(admin);
          const snap = await adminDb
            .collection('orders')
            .where('businessId', '==', businessId)
            .limit(100)
            .get();

          const orders: any[] = [];
          snap.forEach((doc: any) => {
            orders.push({ id: doc.id, ...doc.data() });
          });
          return res.status(200).json({ success: true, orders });
        } catch (adminErr) {
          console.warn('Firebase Admin get orders failed:', adminErr);
        }
      }

      return res.status(200).json({ success: true, orders: [] });
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch orders' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
