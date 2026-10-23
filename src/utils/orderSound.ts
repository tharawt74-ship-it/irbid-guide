/**
 * Professional Restaurant Order Sound & Notification Service
 * Designed for restaurant POS and live order dashboards.
 * 
 * Features:
 * 1. Zero external network dependency (Web Audio API synthesized bell chimes)
 * 2. Unlocks seamlessly on any user gesture (click, tap, keypress)
 * 3. Multi-tone resonant kitchen chime (Ding-Dong-Ding)
 * 4. Vibration feedback for touch/mobile devices
 * 5. Browser desktop push notifications support
 */

let audioCtx: AudioContext | null = null;
let isUnlocked = false;
const unlockListeners: Array<(unlocked: boolean) => void> = [];

export function getOrderAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function isAudioAllowed(): boolean {
  if (!audioCtx) return false;
  return audioCtx.state === 'running' && isUnlocked;
}

export function onAudioStatusChange(cb: (unlocked: boolean) => void): () => void {
  unlockListeners.push(cb);
  cb(isAudioAllowed());
  return () => {
    const idx = unlockListeners.indexOf(cb);
    if (idx >= 0) unlockListeners.splice(idx, 1);
  };
}

function notifyStatusChange() {
  const current = isAudioAllowed();
  unlockListeners.forEach(cb => {
    try { cb(current); } catch (_) {}
  });
}

/**
 * Attempts to resume/unlock the AudioContext after a user gesture.
 */
export async function unlockOrderAudio(): Promise<boolean> {
  try {
    const ctx = getOrderAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Play a silent buffer to truly unlock iOS/Chrome strict autoplay
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    isUnlocked = ctx.state === 'running';
    notifyStatusChange();
    return isUnlocked;
  } catch (err) {
    console.warn("Could not unlock audio context:", err);
    return false;
  }
}

// Global auto-unlock on first user interaction anywhere on the document
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockOrderAudio().then(() => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    });
  };

  window.addEventListener('click', handleFirstInteraction, { passive: true, once: true });
  window.addEventListener('keydown', handleFirstInteraction, { passive: true, once: true });
  window.addEventListener('touchstart', handleFirstInteraction, { passive: true, once: true });
}

/**
 * High-clarity, loud multi-tone Restaurant Order Bell Ring.
 * 
 * Melodic sequence:
 * Note 1: 659.25 Hz (E5)
 * Note 2: 830.61 Hz (G#5)
 * Note 3: 987.77 Hz (B5)
 * Note 4: 1318.51 Hz (E6)
 * Followed by harmonic chime resonance.
 */
export function playOrderNotificationSound(volumeMultiplier: number = 1.0): boolean {
  try {
    const ctx = getOrderAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    
    // Notes sequence (cheerful, loud restaurant bell chime)
    // Double ding-dong: [E5, G#5, B5, E6, High Bell]
    const chordNotes = [
      { freq: 659.25, time: 0.00, dur: 0.45, gain: 0.35 },  // E5
      { freq: 830.61, time: 0.12, dur: 0.45, gain: 0.40 },  // G#5
      { freq: 987.77, time: 0.24, dur: 0.55, gain: 0.45 },  // B5
      { freq: 1318.51, time: 0.38, dur: 0.90, gain: 0.55 }, // E6 (Accent peak)
      { freq: 1661.22, time: 0.50, dur: 0.70, gain: 0.30 }, // G#6 (Sparkle harmonic)
    ];

    chordNotes.forEach(({ freq, time, dur, gain: noteGain }) => {
      const startTime = now + time;
      const stopTime = startTime + dur;

      // Primary tone oscillator (sine for pure bell tone)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Secondary subtle harmonic oscillator (triangle for brass bell depth)
      const oscHarmonic = ctx.createOscillator();
      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);

      // Gain Envelope for realistic acoustic bell decay
      const gainNode = ctx.createGain();
      const actualGain = noteGain * Math.min(Math.max(volumeMultiplier, 0.1), 2.0);

      gainNode.gain.setValueAtTime(0.0001, startTime);
      // Fast strike attack (5ms)
      gainNode.gain.linearRampToValueAtTime(actualGain, startTime + 0.006);
      // Exponential ringing decay
      gainNode.gain.exponentialRampToValueAtTime(actualGain * 0.3, startTime + (dur * 0.3));
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      // Connect nodes
      osc.connect(gainNode);
      oscHarmonic.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Start and schedule stop
      osc.start(startTime);
      oscHarmonic.start(startTime);
      osc.stop(stopTime);
      oscHarmonic.stop(stopTime);
    });

    // Also trigger mobile haptic vibration if supported
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch (_) {}
    }

    return true;
  } catch (err) {
    console.warn("Error playing order notification sound:", err);
    return false;
  }
}

/**
 * Play a double-chime alert (repeated twice for urgent/pending orders)
 */
export function playUrgentOrderChime() {
  playOrderNotificationSound(1.2);
  setTimeout(() => {
    playOrderNotificationSound(1.2);
  }, 900);
}

/**
 * Request desktop push notification permission
 */
export async function requestOrderNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Send a desktop notification when tab is minimized or in background
 */
export function showOrderDesktopNotification(order: any, businessName?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const title = `طلب جديد وارد! 🔔 #${order.shortCode || order.id?.slice(-4) || ''}`;
    const itemsSummary = (order.items || [])
      .map((it: any) => `${it.quantity}x ${it.name}`)
      .join(', ');

    const body = `${businessName ? businessName + ' - ' : ''}الزبون: ${order.customerName || 'ضيف'} | الطاولة: ${order.tableNumber || 'غير محدد'}\nالأصناف: ${itemsSummary || 'طلب جديد'}`;

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `order-${order.id}`,
      requireInteraction: true // Keep on screen until restaurant staff clicks it
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.warn("Desktop notification error:", e);
  }
}
