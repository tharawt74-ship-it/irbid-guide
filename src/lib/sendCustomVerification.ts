import { sendEmailVerification, User } from 'firebase/auth';

/**
 * Sends a direct branded verification email using our custom Vercel Serverless + Gmail API,
 * with graceful fallback to standard Firebase sendEmailVerification if unavailable.
 */
export async function sendDirectEmailVerification(user: User, email: string): Promise<boolean> {
  try {
    // 1. Try sending via our direct Serverless Gmail API
    const response = await fetch('/api/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log("Direct verification email sent successfully!");
        return true;
      }
    } else {
      console.warn("Direct verification API responded with status:", response.status);
    }
  } catch (apiErr) {
    console.warn("Direct verification API call error, falling back to standard Firebase verification:", apiErr);
  }

  // 2. Fallback to standard Firebase sendEmailVerification if API is not reached or in preview
  try {
    const actionCodeSettings = {
      url: window.location.origin + '/verify',
      handleCodeInApp: true,
    };
    await sendEmailVerification(user, actionCodeSettings);
    return true;
  } catch (fallbackErr: any) {
    console.warn("Firebase sendEmailVerification with settings failed, trying plain fallback:", fallbackErr);
    await sendEmailVerification(user);
    return true;
  }
}
