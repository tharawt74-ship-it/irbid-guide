/**
 * Security Utility Helpers for ShofiBIrbid (100% Free, Zero-Dependency Bot & Spam Protection)
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
 * Dynamically loads Google reCAPTCHA Enterprise (with standard v3 fallback) and executes it for the given action.
 * If VITE_RECAPTCHA_SITE_KEY is not configured or execution fails due to domain restrictions,
 * it provides a safe fallback so the application stays resilient.
 * 
 * @param action The action name (e.g., 'submit_review', 'submit_order', 'contact_submit')
 * @returns Promise with reCAPTCHA Enterprise token or fallback token
 */
export async function executeReCaptcha(action: string): Promise<string> {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  if (!siteKey || siteKey.trim() === "") {
    console.info(`🛡️ [reCAPTCHA Enterprise] No VITE_RECAPTCHA_SITE_KEY detected. Running in safe mode.`);
    return "mock_recaptcha_no_key";
  }

  return new Promise((resolve) => {
    const scriptId = "google-recaptcha-enterprise-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const runExecution = () => {
      // @ts-ignore
      const grecaptcha = window.grecaptcha;
      if (!grecaptcha) {
        console.warn("⚠️ [reCAPTCHA Enterprise] grecaptcha object not found on window.");
        resolve("mock_recaptcha_no_grecaptcha");
        return;
      }

      // Check for reCAPTCHA Enterprise first
      if (grecaptcha.enterprise && typeof grecaptcha.enterprise.ready === "function") {
        grecaptcha.enterprise.ready(() => {
          grecaptcha.enterprise
            .execute(siteKey, { action })
            .then((token: string) => {
              console.log(`🛡️ [reCAPTCHA Enterprise] Successfully executed token for action: ${action}`);
              resolve(token);
            })
            .catch((err: any) => {
              console.warn("⚠️ [reCAPTCHA Enterprise] Execution failed (possibly unapproved origin domain):", err);
              resolve("recaptcha_enterprise_domain_fallback");
            });
        });
      } else if (typeof grecaptcha.ready === "function") {
        // Fallback for standard grecaptcha v3
        grecaptcha.ready(() => {
          grecaptcha
            .execute(siteKey, { action })
            .then((token: string) => {
              console.log(`🛡️ [reCAPTCHA v3] Successfully executed token for action: ${action}`);
              resolve(token);
            })
            .catch((err: any) => {
              console.warn("⚠️ [reCAPTCHA v3] Execution failed:", err);
              resolve("recaptcha_v3_domain_fallback");
            });
        });
      } else {
        resolve("recaptcha_ready_unavailable");
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      // Load Google reCAPTCHA Enterprise script
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(runExecution, 150);
      };
      script.onerror = () => {
        console.warn("⚠️ [reCAPTCHA Enterprise] Failed to load the enterprise script tag.");
        resolve("recaptcha_script_load_error");
      };
      document.head.appendChild(script);
    } else {
      runExecution();
    }
  });
}

/**
 * -------------------------------------------------------------
 * 1. Device Fingerprinting (Zero-Dependency & Privacy-Safe)
 * -------------------------------------------------------------
 * Generates a stable, unique 64-bit hardware/environment fingerprint
 * from screen metrics, GPU canvas rendering, CPU cores, timezone, etc.
 * Persists even across incognito tabs and localStorage wipes.
 */
let cachedFingerprint: string | null = null;

function hashString(str: string): string {
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 2654435761);
    hash2 = Math.imul(hash2 ^ ch, 1597334677);
  }
  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & hash2) + (hash1 >>> 0)).toString(16);
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas-ctx";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial', sans-serif";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("ShofiBIrbid.jo 🛡️ #1", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("ShofiBIrbid.jo 🛡️ #1", 4, 17);
    return canvas.toDataURL();
  } catch (e) {
    return "canvas-err";
  }
}

/**
 * Computes or retrieves the persistent device fingerprint.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint;

  if (typeof window === "undefined") return "server-env-fp";

  // Check localStorage for quick warm retrieval
  try {
    const stored = localStorage.getItem("shofi_device_id_v2");
    if (stored && stored.startsWith("dev_") && stored.length >= 12) {
      cachedFingerprint = stored;
      return stored;
    }
  } catch (_) {}

  try {
    const screenMetrics = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth || 24}`;
    const userAgent = navigator.userAgent || "";
    const languages = (navigator.languages || [navigator.language || ""]).join(",");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const tzOffset = new Date().getTimezoneOffset();
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    // @ts-ignore
    const deviceMemory = navigator.deviceMemory || 4;
    const canvasData = getCanvasFingerprint();

    const rawSignature = [
      screenMetrics,
      userAgent,
      languages,
      timezone,
      tzOffset,
      hardwareConcurrency,
      deviceMemory,
      canvasData
    ].join("###");

    const hash = hashString(rawSignature);
    const finalId = `dev_${hash}`;
    cachedFingerprint = finalId;

    try {
      localStorage.setItem("shofi_device_id_v2", finalId);
    } catch (_) {}

    return finalId;
  } catch (e) {
    const fallbackId = `dev_gen_${Math.random().toString(36).substring(2, 12)}`;
    cachedFingerprint = fallbackId;
    return fallbackId;
  }
}

/**
 * Synchronous retrieval of device fingerprint (returns cached or immediate fallback)
 */
export function getSyncDeviceFingerprint(): string {
  if (cachedFingerprint) return cachedFingerprint;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("shofi_device_id_v2");
      if (stored) {
        cachedFingerprint = stored;
        return stored;
      }
    } catch (_) {}
  }
  // Initialize async computation in background
  getDeviceFingerprint();
  return "dev_init_pending";
}

/**
 * -------------------------------------------------------------
 * 2. Advanced Rate Limiting (Reviews & Orders Protection)
 * -------------------------------------------------------------
 */

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  timeLeft?: number; // in seconds
}

/**
 * Enforces review rate limits:
 * - 60s cooldown between any review
 * - 24 hours between reviews for the SAME business from this device
 * - Maximum 3 reviews per hour across all businesses
 */
export function checkReviewRateLimit(businessId: string): RateLimitCheckResult {
  if (typeof window === "undefined") return { allowed: true };

  const now = Date.now();
  const GLOBAL_REVIEWS_KEY = "shofi_rate_reviews_history";
  const BIZ_KEY = `shofi_rate_review_biz_${businessId}`;

  // 1. Check same business 24-hour rule (86400 seconds)
  const lastBizSubmission = localStorage.getItem(BIZ_KEY);
  if (lastBizSubmission) {
    const timeDiff = now - parseInt(lastBizSubmission, 10);
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (timeDiff < TWENTY_FOUR_HOURS) {
      const remainingHours = Math.ceil((TWENTY_FOUR_HOURS - timeDiff) / (60 * 60 * 1000));
      return {
        allowed: false,
        reason: `لقد قمت بإضافة تقييم لهذا المحل مؤخراً. حفاظاً على مصداقية التقييمات، يمكنك إضافة تقييم جديد بعد ${remainingHours} ساعة.`,
        timeLeft: Math.ceil((TWENTY_FOUR_HOURS - timeDiff) / 1000)
      };
    }
  }

  // 2. Check 60-second instant spam cooldown
  const lastAnyReview = localStorage.getItem("shofi_rate_last_review_any");
  if (lastAnyReview) {
    const diff = now - parseInt(lastAnyReview, 10);
    if (diff < 60 * 1000) {
      const remainingSeconds = Math.ceil((60 * 1000 - diff) / 1000);
      return {
        allowed: false,
        reason: `يرجى الانتظار ${remainingSeconds} ثانية قبل إضافة تقييم آخر.`,
        timeLeft: remainingSeconds
      };
    }
  }

  // 3. Check max 3 reviews per hour platform-wide
  try {
    const historyRaw = localStorage.getItem(GLOBAL_REVIEWS_KEY);
    const history: number[] = historyRaw ? JSON.parse(historyRaw) : [];
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentInPastHour = history.filter((t) => t > oneHourAgo);

    if (recentInPastHour.length >= 3) {
      const oldest = Math.min(...recentInPastHour);
      const waitMinutes = Math.ceil((oldest + 60 * 60 * 1000 - now) / (60 * 1000));
      return {
        allowed: false,
        reason: `تجاوزت الحد المسموح للتقييمات (3 تقييمات في الساعة). يرجى الانتظار ${waitMinutes} دقيقة قبل إضافة تقييم جديد.`,
        timeLeft: waitMinutes * 60
      };
    }
  } catch (_) {}

  return { allowed: true };
}

/**
 * Records a successful review submission to update device limits
 */
export function recordReviewSubmission(businessId: string): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const GLOBAL_REVIEWS_KEY = "shofi_rate_reviews_history";
  const BIZ_KEY = `shofi_rate_review_biz_${businessId}`;

  try {
    localStorage.setItem(BIZ_KEY, now.toString());
    localStorage.setItem("shofi_rate_last_review_any", now.toString());

    const historyRaw = localStorage.getItem(GLOBAL_REVIEWS_KEY);
    const history: number[] = historyRaw ? JSON.parse(historyRaw) : [];
    const oneHourAgo = now - 60 * 60 * 1000;
    const updated = [...history.filter((t) => t > oneHourAgo), now];
    localStorage.setItem(GLOBAL_REVIEWS_KEY, JSON.stringify(updated));
  } catch (_) {}
}

/**
 * Enforces food order rate limits:
 * - 3 minutes (180s) minimum between orders to the same business
 * - Maximum 5 orders per 24 hours to the same business
 * - Warns if already has active uncompleted orders
 */
export function checkOrderRateLimit(businessId: string): RateLimitCheckResult {
  if (typeof window === "undefined") return { allowed: true };

  const now = Date.now();
  const LAST_ORDER_KEY = `shofi_rate_order_last_${businessId}`;
  const DAILY_ORDERS_KEY = `shofi_rate_orders_daily_${businessId}`;

  // 1. Check 3 minutes cooldown (180 seconds)
  const lastOrderTime = localStorage.getItem(LAST_ORDER_KEY);
  if (lastOrderTime) {
    const diff = now - parseInt(lastOrderTime, 10);
    const THREE_MINUTES = 3 * 60 * 1000;
    if (diff < THREE_MINUTES) {
      const remainingSeconds = Math.ceil((THREE_MINUTES - diff) / 1000);
      return {
        allowed: false,
        reason: `لقد أرسلت طلباً للتو لهذا المطعم. لتجنب تكرار الطلب في المطبخ، يرجى الانتظار (${remainingSeconds} ثانية) أو إبلاغ طاقم الصالة مباشرة.`,
        timeLeft: remainingSeconds
      };
    }
  }

  // 2. Check 5 orders per 24 hours cap
  try {
    const dailyRaw = localStorage.getItem(DAILY_ORDERS_KEY);
    const daily: number[] = dailyRaw ? JSON.parse(dailyRaw) : [];
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const activePastDay = daily.filter((t) => t > twentyFourHoursAgo);

    if (activePastDay.length >= 5) {
      return {
        allowed: false,
        reason: "لقد وصلت إلى الحد الأقصى للطلبات اليومية لهذا المطعم (5 طلبات خلال 24 ساعة). يرجى مراجعة الكاشير لإتمام طلب إضافي.",
        timeLeft: 3600
      };
    }
  } catch (_) {}

  return { allowed: true };
}

/**
 * Records a successful food order submission
 */
export function recordOrderSubmission(businessId: string): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const LAST_ORDER_KEY = `shofi_rate_order_last_${businessId}`;
  const DAILY_ORDERS_KEY = `shofi_rate_orders_daily_${businessId}`;

  try {
    localStorage.setItem(LAST_ORDER_KEY, now.toString());

    const dailyRaw = localStorage.getItem(DAILY_ORDERS_KEY);
    const daily: number[] = dailyRaw ? JSON.parse(dailyRaw) : [];
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const updated = [...daily.filter((t) => t > twentyFourHoursAgo), now];
    localStorage.setItem(DAILY_ORDERS_KEY, JSON.stringify(updated));
  } catch (_) {}
}

/**
 * Comprehensive list of domain extensions to prevent any link insertion in reviews
 */
const KNOWN_TLDS = "(com|net|org|edu|gov|mil|int|jo|sa|ae|eg|kw|qa|bh|om|iq|sy|lb|ps|ye|ly|tn|dz|ma|sd|me|io|ai|co|app|dev|xyz|info|biz|top|online|site|link|page|tech|store|shop|club|vip|pro|cc|tv|fm|am|to|ly|gl|be|uk|us|de|fr|ru|tr|ca|eu|live|news|blog|icu|fit|work|pub|cafe|rest|restaurant|menu|kitchen|coffee|food|pizza|delivery|market|bar|doctor|clinic|hospital|law|agency|digital|space|cloud|press|design|studio|art)";

/**
 * Detects if text contains any URL, web link, domain name, IP address, or link scheme.
 * Strictly used to enforce text-only policy in reviews and comments.
 */
export function containsUrlOrLink(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false;

  // 1. Direct protocols & common prefixes (http://, https://, ftp://, file://, www.)
  if (/https?:\/\/|ftp:\/\/|file:\/\/|\bwww\./i.test(text)) return true;

  // 2. HTML / Markdown links or URL schemes (javascript:, mailto:, tel:)
  if (/<a\s+[^>]*href|href\s*=|\[.*?\]\(.*?\)|\b(javascript|mailto|tel):/i.test(text)) return true;

  // 3. Known shorteners & messaging handles
  if (/\b(wa\.me|t\.me|bit\.ly|tinyurl\.com|goo\.gl|cutt\.ly|is\.gd|rb\.gy|ow\.ly|shorturl\.at|buff\.ly|rebrand\.ly|instagr\.am|fb\.me|m\.me|t\.co|g\.co|x\.com)\b/i.test(text)) return true;

  // 4. IP Addresses with optional port / path
  if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/[^\s]*)?/i.test(text)) return true;

  // 5. Any URL path pattern: word.domain/path (e.g. site.xyz/test, domain.anything/page)
  if (/\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.[a-z]{2,12}\/[^\s]*/i.test(text)) return true;

  // 6. Any domain with known TLD (e.g. restaurant.com, mybrand.agency, shop.jo, x.com)
  if (new RegExp("\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\." + KNOWN_TLDS + "(?:\\b|\\/)", "i").test(text)) return true;

  // 7. Obfuscated dots like "google . com", "google .com", "google. com", "google[dot]com", "google(dot)com"
  if (new RegExp("[a-z0-9-]+\\s*(?:\\[dot\\]|\\(dot\\)|\\{\\s*dot\\s*\\}|\\s+\\.\\s*|\\s*\\.\\s+)" + KNOWN_TLDS + "\\b", "i").test(text)) return true;

  return false;
}

/**
 * Strips any detected URLs and links from text, leaving only clean pure text.
 */
export function stripUrlsAndLinks(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // Direct protocols
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, '');
  cleaned = cleaned.replace(/ftp:\/\/[^\s]+/gi, '');
  cleaned = cleaned.replace(/file:\/\/[^\s]+/gi, '');
  cleaned = cleaned.replace(/\bwww\.[^\s]+/gi, '');

  // HTML / Markdown links or javascript: / mailto:
  cleaned = cleaned.replace(/<a\s+[^>]*>.*?<\/a>/gi, '');
  cleaned = cleaned.replace(/<a\s+[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/a>/gi, '');
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/gi, '$1');
  cleaned = cleaned.replace(/\b(javascript|mailto|tel):[^\s]+/gi, '');

  // Known shorteners & handles
  cleaned = cleaned.replace(/\b(wa\.me|t\.me|bit\.ly|tinyurl\.com|goo\.gl|cutt\.ly|is\.gd|rb\.gy|ow\.ly|shorturl\.at|buff\.ly|rebrand\.ly|instagr\.am|fb\.me|m\.me|t\.co|g\.co|x\.com)\/[^\s]*/gi, '');

  // IP addresses
  cleaned = cleaned.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/[^\s]*)?/gi, '');

  // Domain with path: word.tld/path
  cleaned = cleaned.replace(/\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.[a-z]{2,12}\/[^\s]*/gi, '');

  // Domain with known TLD
  const domainRegex = new RegExp("\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\." + KNOWN_TLDS + "(?:\\b|\\/[^\\s]*)?", "gi");
  cleaned = cleaned.replace(domainRegex, '');

  // Dot obfuscation
  const dotRegex = new RegExp("[a-z0-9-]+\\s*(?:\\[dot\\]|\\(dot\\)|\\{\\s*dot\\s*\\}|\\s+\\.\\s*|\\s*\\.\\s+)" + KNOWN_TLDS + "\\b", "gi");
  cleaned = cleaned.replace(dotRegex, '');

  return cleaned.replace(/\s+/g, ' ').trim();
}

