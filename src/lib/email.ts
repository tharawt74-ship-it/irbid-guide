import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function sendCustomVerificationEmail(user: { uid: string; email: string | null; displayName?: string | null }) {
  if (!db) {
    throw new Error('Database is not initialized.');
  }
  if (!user.email) {
    throw new Error('User email is required to send verification email.');
  }

  // 1. Generate a cryptographically secure random token string
  const token = Array.from(crypto.getRandomValues(new Uint8Array(20)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // 2. Save the token to the /verification_tokens/ collection in Firestore
  const tokenRef = doc(db, 'verification_tokens', token);
  await setDoc(tokenRef, {
    uid: user.uid,
    email: user.email.toLowerCase().trim(),
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours expiry
  });

  // 3. Call our backend endpoint to send the beautifully customized email via Resend
  const response = await fetch('/api/auth/send-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      token: token,
      displayName: user.displayName || user.email.split('@')[0] || 'مستخدم إربد',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Failed to send verification email.');
  }

  return { success: true, token };
}

/**
 * Non-blocking background queue function for sending verification email
 * to prevent blocking frontend UI render loops or registration workflows.
 */
export function enqueueVerificationEmail(user: { uid: string; email: string | null; displayName?: string | null }) {
  setTimeout(async () => {
    try {
      await sendCustomVerificationEmail(user);
      console.log(`[Email Queue] Verification email dispatched successfully to ${user.email}`);
    } catch (error) {
      console.error(`[Email Queue Error] Failed to dispatch verification email:`, error);
    }
  }, 0);
}

