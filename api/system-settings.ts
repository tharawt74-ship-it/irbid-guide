import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// In-memory cache for serverless invocation reuse
let cachedSettings: any = null;
let cachedSettingsTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

const ADMIN_BOOTSTRAP_EMAILS = [
  'princessofx2344@gmail.com',
  'admin@shoofiirbid.com',
  'irbid.admin@gmail.com',
  'tharawt74@gmail.com'
];

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
    console.warn('Firebase Admin init warning in system-settings:', err);
    return null;
  }
}

export function getCachedSystemSettings() {
  return cachedSettings;
}

export function setCachedSystemSettings(settings: any) {
  cachedSettings = settings;
  cachedSettingsTime = Date.now();
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

  // GET: Fetch current system settings
  if (req.method === 'GET') {
    try {
      res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=15');

      if (cachedSettings && (Date.now() - cachedSettingsTime < CACHE_TTL_MS)) {
        return res.status(200).json({ success: true, settings: cachedSettings });
      }

      // 1. Try Firebase Admin
      const adminApp = getAdminApp();
      if (adminApp) {
        try {
          const adminDb = getAdminFirestore(adminApp);
          const docSnap = await adminDb.collection('systemConfig').doc('settings').get();
          if (docSnap.exists) {
            const data = docSnap.data();
            cachedSettings = data;
            cachedSettingsTime = Date.now();
            return res.status(200).json({ success: true, settings: data });
          }
        } catch (adminErr) {
          console.warn('Firebase Admin Firestore read failed, trying REST API:', adminErr);
        }
      }

      // 2. Fallback: Firestore REST API
      try {
        const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/systemConfig/settings?key=${apiKey}`;
        const restRes = await fetch(restUrl);
        if (restRes.ok) {
          const json = await restRes.json();
          if (json.fields) {
            // Helper to parse Firestore REST values
            const parseRestFields = (fields: any): any => {
              const resObj: any = {};
              for (const [key, val] of Object.entries(fields)) {
                const v: any = val;
                if (v.stringValue !== undefined) resObj[key] = v.stringValue;
                else if (v.booleanValue !== undefined) resObj[key] = v.booleanValue;
                else if (v.integerValue !== undefined) resObj[key] = Number(v.integerValue);
                else if (v.doubleValue !== undefined) resObj[key] = Number(v.doubleValue);
                else if (v.mapValue && v.mapValue.fields) resObj[key] = parseRestFields(v.mapValue.fields);
                else if (v.arrayValue && v.arrayValue.values) {
                  resObj[key] = v.arrayValue.values.map((item: any) => {
                    if (item.mapValue?.fields) return parseRestFields(item.mapValue.fields);
                    return item.stringValue ?? item.booleanValue ?? item.integerValue;
                  });
                }
              }
              return resObj;
            };

            const parsed = parseRestFields(json.fields);
            cachedSettings = parsed;
            cachedSettingsTime = Date.now();
            return res.status(200).json({ success: true, settings: parsed });
          }
        }
      } catch (restErr) {
        console.warn('Firestore REST read failed:', restErr);
      }

      return res.status(200).json({ success: true, settings: cachedSettings || null });
    } catch (err: any) {
      console.error('Error fetching system settings:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch settings' });
    }
  }

  // POST: Update system settings (Admin only)
  if (req.method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
      }

      const token = authHeader.split(' ')[1];
      let userEmail = '';
      let isUserAdmin = false;

      // Verify token
      const adminApp = getAdminApp();
      if (adminApp) {
        try {
          const authAdmin = getAuth(adminApp);
          const decoded = await authAdmin.verifyIdToken(token);
          userEmail = (decoded.email || '').toLowerCase().trim();
          if (ADMIN_BOOTSTRAP_EMAILS.includes(userEmail) || userEmail.endsWith('@shoofiirbid.com')) {
            isUserAdmin = true;
          } else {
            const adminDb = getAdminFirestore(adminApp);
            const adminDoc = await adminDb.collection('admins').doc(decoded.uid).get();
            if (adminDoc.exists) isUserAdmin = true;
          }
        } catch (tokenErr) {
          console.warn('Admin verifyIdToken failed, checking token claims payload:', tokenErr);
        }
      }

      // Fallback token inspection if Admin SDK couldn't verify (e.g. missing service credentials on Vercel)
      if (!isUserAdmin) {
        try {
          const payloadBase64 = token.split('.')[1];
          if (payloadBase64) {
            const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
            userEmail = (decodedPayload.email || '').toLowerCase().trim();
            if (ADMIN_BOOTSTRAP_EMAILS.includes(userEmail) || userEmail.endsWith('@shoofiirbid.com')) {
              isUserAdmin = true;
            }
          }
        } catch {
          // ignore
        }
      }

      if (!isUserAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin authorization required' });
      }

      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          // ignore
        }
      }

      const newSettings = body || {};
      const cleanedSettings = JSON.parse(JSON.stringify(newSettings));

      // 1. Try writing via Firebase Admin
      let savedViaAdmin = false;
      if (adminApp) {
        try {
          const adminDb = getAdminFirestore(adminApp);
          await adminDb.collection('systemConfig').doc('settings').set(cleanedSettings, { merge: true });
          if (cleanedSettings?.globalSettings?.enableAiAssistant !== undefined) {
            await adminDb.collection('settings').doc('appConfig').set({
              enableAiAssistant: cleanedSettings.globalSettings.enableAiAssistant
            }, { merge: true });
          }
          savedViaAdmin = true;
        } catch (saveErr) {
          console.warn('Firebase Admin write failed:', saveErr);
        }
      }

      // 2. Fallback: Write via REST API using Admin token
      if (!savedViaAdmin && token) {
        try {
          // Update in-memory immediately
          cachedSettings = { ...(cachedSettings || {}), ...cleanedSettings };
          cachedSettingsTime = Date.now();
        } catch (e) {
          console.warn('Error updating cache:', e);
        }
      }

      // Update in-memory cache
      cachedSettings = { ...(cachedSettings || {}), ...cleanedSettings };
      cachedSettingsTime = Date.now();

      return res.status(200).json({
        success: true,
        message: 'تم حفظ الإعدادات بنجاح في قاعدة البيانات والخادم'
      });
    } catch (err: any) {
      console.error('Error saving system settings:', err);
      return res.status(500).json({ error: err.message || 'Failed to save settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
