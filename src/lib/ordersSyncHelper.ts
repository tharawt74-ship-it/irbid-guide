// Helper for client-side local & cross-tab real-time sync of orders

const CHANNEL_NAME = 'irbid_orders_channel';
const LOCAL_STORAGE_KEY = 'irbid_local_orders';

let globalBroadcastChannel: BroadcastChannel | null = null;
function getGlobalBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  if (!globalBroadcastChannel) {
    try {
      globalBroadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch (_) {}
  }
  return globalBroadcastChannel;
}

export function getLocalOrders(businessId?: string): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed: any[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (businessId) {
      return parsed.filter(o => o.businessId === businessId || String(o.businessId) === String(businessId));
    }
    return parsed;
  } catch (e) {
    return [];
  }
}

export function saveLocalOrder(order: any) {
  if (typeof window === 'undefined' || !order || !order.id) return;
  try {
    const existing = getLocalOrders();
    const index = existing.findIndex(o => o.id === order.id);
    if (index >= 0) {
      existing[index] = { ...existing[index], ...order };
    } else {
      existing.unshift(order);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing.slice(0, 100))); // Keep latest 100 orders
    
    // Also sync the active order key for the business if applicable
    if (order.businessId) {
      try {
        const activeKey = `irbid_active_order_${order.businessId}`;
        const currentActiveRaw = localStorage.getItem(activeKey);
        if (currentActiveRaw) {
          const currentActive = JSON.parse(currentActiveRaw);
          if (currentActive && currentActive.id === order.id) {
            localStorage.setItem(activeKey, JSON.stringify({ ...currentActive, ...order }));
          }
        }
      } catch (_) {}
    }

    broadcastOrderUpdate(order);
  } catch (e) {
    console.warn("Error saving local order:", e);
  }
}

export function broadcastOrderUpdate(order: any) {
  if (typeof window === 'undefined' || !order) return;
  try {
    // 1. Dispatch local window event
    window.dispatchEvent(new CustomEvent('irbid_order_updated', { detail: order }));

    // 2. BroadcastChannel for cross-tab communication
    const channel = getGlobalBroadcastChannel();
    if (channel) {
      channel.postMessage({ type: 'ORDER_UPDATED', order });
    }
  } catch (e) {
    // ignore broadcast errors
  }
}

export function subscribeToLocalOrders(callback: (order: any) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: any) => {
    if (e.detail) {
      callback(e.detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          parsed.forEach(o => {
            if (o && o.id) callback(o);
          });
        }
      } catch (_) {}
    }
    if (e.key && e.key.startsWith('irbid_active_order_') && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.id) {
          callback(parsed);
        }
      } catch (_) {}
    }
  };

  const channel = getGlobalBroadcastChannel();
  const handleChannelMsg = (event: MessageEvent) => {
    if (event.data && event.data.type === 'ORDER_UPDATED' && event.data.order) {
      callback(event.data.order);
    }
  };

  if (channel) {
    channel.addEventListener('message', handleChannelMsg);
  }

  window.addEventListener('irbid_order_updated', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('irbid_order_updated', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (channel) {
      channel.removeEventListener('message', handleChannelMsg);
    }
  };
}
