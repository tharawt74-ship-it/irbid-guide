import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ADMIN_BOOTSTRAP_EMAILS = [
  'princessofx2344@gmail.com'
];

function getAdminApp() {
  try {
    const existing = getApps();
    if (existing.length > 0) return existing[0];

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
    console.warn('Firebase Admin init warning in delete-user:', err);
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
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split(' ')[1];
    const adminApp = getAdminApp();
    if (!adminApp) {
      return res.status(500).json({ error: 'Firebase Admin not initialized' });
    }

    const authAdmin = getAuth(adminApp);
    const decodedToken = await authAdmin.verifyIdToken(token);
    const callerEmail = (decodedToken.email || '').toLowerCase().trim();
    const callerUid = decodedToken.uid;

    const adminDb = getFirestore(adminApp);

    let isAuthorized = ADMIN_BOOTSTRAP_EMAILS.includes(callerEmail);
    if (!isAuthorized) {
      const adminDoc = await adminDb.collection('admins').doc(callerUid).get();
      if (adminDoc.exists) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to delete users' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // ignore JSON parse error
      }
    }

    const targetUid = (body?.targetUid || '').toString().trim();
    const targetEmail = (body?.targetEmail || '').toString().toLowerCase().trim();

    if (!targetUid && !targetEmail) {
      return res.status(400).json({ error: 'Missing targetUid or targetEmail' });
    }

    // Never allow deleting the primary super admin account
    if (targetEmail === 'princessofx2344@gmail.com') {
      return res.status(400).json({ error: 'Cannot delete primary super admin account' });
    }

    // 1. Delete from Firebase Authentication
    let authDeleted = false;
    if (targetUid) {
      try {
        await authAdmin.deleteUser(targetUid);
        authDeleted = true;
      } catch (authErr: any) {
        if (authErr?.code !== 'auth/user-not-found') {
          console.warn('Could not delete user by UID from auth:', authErr?.message);
        }
      }
    }

    // If UID wasn't found in Auth but email is provided, try finding by email
    if (!authDeleted && targetEmail) {
      try {
        const userRecord = await authAdmin.getUserByEmail(targetEmail);
        if (userRecord && userRecord.uid) {
          await authAdmin.deleteUser(userRecord.uid);
          authDeleted = true;
        }
      } catch (emailErr: any) {
        if (emailErr?.code !== 'auth/user-not-found') {
          console.warn('Could not delete user by email from auth:', emailErr?.message);
        }
      }
    }

    // 2. Delete Firestore documents (users, supervisors, admins)
    const promises: Promise<any>[] = [];
    if (targetUid) {
      promises.push(adminDb.collection('users').doc(targetUid).delete().catch(() => {}));
      promises.push(adminDb.collection('supervisors').doc(targetUid).delete().catch(() => {}));
      promises.push(adminDb.collection('admins').doc(targetUid).delete().catch(() => {}));
    }

    // 3. Record in deleted_emails so re-login is completely blocked unless they register fresh
    if (targetEmail) {
      promises.push(
        adminDb.collection('deleted_emails').doc(targetEmail).set({
          email: targetEmail,
          uid: targetUid || '',
          deletedAt: Date.now(),
          deletedBy: callerEmail
        }, { merge: true }).catch(() => {})
      );
    }

    await Promise.all(promises);

    return res.status(200).json({
      success: true,
      message: 'User deleted permanently from system and authentication',
      authDeleted
    });
  } catch (err: any) {
    console.error('Error in delete-user handler:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
