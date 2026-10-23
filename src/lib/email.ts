import { sendEmailVerification, User } from 'firebase/auth';
import { auth } from './firebase';

/**
 * Sends an email verification message natively using Firebase Authentication.
 * Dispatches the official verification email directly from Firebase rather than Resend.
 */
export async function sendFirebaseVerificationEmail(
  userOrAccount?: User | { uid?: string; email?: string | null; displayName?: string | null } | null
) {
  if (!auth) {
    throw new Error('خدمة المصادقة غير مهيأة');
  }

  // 1. Resolve Firebase User instance
  let targetUser: User | null = null;

  if (userOrAccount && typeof (userOrAccount as any).getIdToken === 'function') {
    targetUser = userOrAccount as User;
  } else if (auth.currentUser) {
    targetUser = auth.currentUser;
  }

  if (!targetUser) {
    console.warn("No active Firebase user found for sending verification email");
    return { success: false, reason: 'no-user' };
  }

  // 2. Dispatch native Firebase verification email
  try {
    await sendEmailVerification(targetUser);
  } catch (err: any) {
    console.error("Firebase sendEmailVerification error:", err);
    throw err;
  }

  return { success: true };
}

// Seamless alias to ensure all existing calls automatically use Firebase
export const sendCustomVerificationEmail = sendFirebaseVerificationEmail;

/**
 * Non-blocking background queue function for sending verification email
 * to prevent blocking frontend UI render loops or registration workflows.
 */
export function enqueueVerificationEmail(
  user?: User | { uid?: string; email?: string | null; displayName?: string | null } | null
) {
  setTimeout(async () => {
    try {
      await sendFirebaseVerificationEmail(user);
      console.log(`[Email Queue] Firebase verification email dispatched successfully`);
    } catch (error) {
      console.error(`[Email Queue Error] Failed to dispatch Firebase verification email:`, error);
    }
  }, 0);
}
