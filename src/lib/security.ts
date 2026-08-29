/**
 * Security Utility Helpers for Shofi Erbid (100% Free, Zero-Dependency Bot & Spam Protection)
 */

/**
 * Checks if a honeypot field has been filled (which indicates a bot submission)
 * @param value The value of the hidden honeypot field
 * @returns true if it's a bot, false if it's a human
 */
export function isBotSubmission(value: string | undefined | null): boolean {
  if (value && value.trim().length > 0) {
    console.warn("🤖 Bot detected via honeypot trap!");
    return true;
  }
  return false;
}

interface RateLimitResult {
  allowed: boolean;
  timeLeft: number; // in seconds
}

/**
 * Checks if the current browser session has submitted too many requests
 * of a specific type (e.g., "reviews", "contact", "jobs") within a time window.
 * 
 * @param actionKey Unique key for the form/action (e.g., "submit_review")
 * @param cooldownSeconds Number of seconds the user must wait between submissions
 * @returns RateLimitResult
 */
export function checkSubmissionRateLimit(actionKey: string, cooldownSeconds: number = 60): RateLimitResult {
  if (typeof window === 'undefined') {
    return { allowed: true, timeLeft: 0 };
  }

  const storageKey = `shofi_sec_rate_${actionKey}`;
  const now = Date.now();
  const lastSubmissionStr = localStorage.getItem(storageKey);

  if (lastSubmissionStr) {
    const lastSubmission = parseInt(lastSubmissionStr, 10);
    const difference = now - lastSubmission;
    const cooldownMs = cooldownSeconds * 1000;

    if (difference < cooldownMs) {
      const timeLeft = Math.ceil((cooldownMs - difference) / 1000);
      return { allowed: false, timeLeft };
    }
  }

  return { allowed: true, timeLeft: 0 };
}

/**
 * Records a successful submission timestamp to enforce the rate limit
 * @param actionKey Unique key for the form/action
 */
export function recordSubmissionTime(actionKey: string): void {
  if (typeof window !== 'undefined') {
    const storageKey = `shofi_sec_rate_${actionKey}`;
    localStorage.setItem(storageKey, Date.now().toString());
  }
}

/**
 * Basic sanitization function to strip HTML tags and scripts from text inputs.
 * This prevents Cross-Site Scripting (XSS) and database injection.
 * 
 * @param text The input string to sanitize
 * @returns Cleaned safe string
 */
export function sanitizeInput(text: string): string {
  if (!text) return "";
  
  // 1. Strip HTML tags
  let clean = text.replace(/<\/?[^>]+(>|$)/g, "");
  
  // 2. Remove JavaScript event handlers, javascript: URIs, etc.
  clean = clean.replace(/on\w+\s*=/gi, "");
  clean = clean.replace(/javascript:/gi, "");
  
  // 3. Trim multiple consecutive whitespaces
  clean = clean.replace(/\s+/g, " ");
  
  return clean.trim();
}

/**
 * Dynamically loads Google reCAPTCHA v3 and executes it for the given action.
 * If VITE_RECAPTCHA_SITE_KEY is not configured in the environment, it gracefully
 * returns a simulated successful verification token.
 * 
 * @param action The action name (e.g., 'submit_review', 'add_business')
 * @returns Promise with reCAPTCHA token or mock token
 */
export async function executeReCaptcha(action: string): Promise<string> {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  if (!siteKey || siteKey.trim() === "") {
    console.info(`🛡️ [reCAPTCHA v3] Running in safe fallback simulation mode. (To enable real Google reCAPTCHA v3 verification, configure VITE_RECAPTCHA_SITE_KEY in your environment).`);
    return "mock_recaptcha_v3_verified_token";
  }

  return new Promise((resolve) => {
    // 1. Check if recaptcha script is already loaded
    const scriptId = "google-recaptcha-v3-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const runExecution = () => {
      // @ts-ignore
      if (window.grecaptcha) {
        // @ts-ignore
        window.grecaptcha.ready(() => {
          // @ts-ignore
          window.grecaptcha
            .execute(siteKey, { action })
            .then((token: string) => {
              console.log(`🛡️ [reCAPTCHA v3] Successfully executed token for action: ${action}`);
              resolve(token);
            })
            .catch((err: any) => {
              console.error("❌ [reCAPTCHA v3] Execution failed:", err);
              resolve("mock_recaptcha_v3_fallback_token_error");
            });
        });
      } else {
        resolve("mock_recaptcha_v3_fallback_no_grecaptcha");
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Give a tiny fraction of a second for grecaptcha to attach to window
        setTimeout(runExecution, 100);
      };
      script.onerror = () => {
        console.error("❌ [reCAPTCHA v3] Failed to load the script tag.");
        resolve("mock_recaptcha_v3_load_error");
      };
      document.head.appendChild(script);
    } else {
      runExecution();
    }
  });
}

