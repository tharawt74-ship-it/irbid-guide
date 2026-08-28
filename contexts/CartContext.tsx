import React, { createContext, useContext, useState, useEffect } from 'react';
import { MenuItem } from '../types';

export interface CartItem {
  id: string;
  name: string;
  price: string | number;
  originalPrice?: string;
  quantity: number;
  category?: string;
  image?: string;
  options?: string[];
  notes?: string;
  businessId: string;
  businessName: string;
  businessPhone?: string;
}

export interface BusinessCartInfo {
  id: string;
  name: string;
  phone?: string;
}

interface CartContextType {
  items: CartItem[];
  businessId: string | null;
  businessName: string | null;
  businessPhone: string | null;
  pendingConflict: { item: MenuItem; business: BusinessCartInfo } | null;
  isFloatingCartVisible: boolean;
  
  addItem: (item: MenuItem, business: BusinessCartInfo) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  confirmReplaceCart: () => void;
  cancelConflict: () => void;
  
  getItemQuantity: (itemId: string) => number;
  totalCount: number;
  totalPrice: number;
  
  setIsFloatingCartVisible: (visible: boolean) => void;
  hideFloatingCart: () => void;
  showFloatingCart: () => void;
  toggleFloatingCart: () => void;
  sendOrderViaWhatsapp: () => void;
}

const CART_STORAGE_KEY = 'irbid_cart_data_v2';

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed.items) ? parsed.items : [];
      }
    } catch (e) {
      console.error('Failed to parse cart from storage:', e);
    }
    return [];
  });

  const [businessId, setBusinessId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.businessId || null;
      }
    } catch (e) {}
    return null;
  });

  const [businessName, setBusinessName] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.businessName || null;
      }
    } catch (e) {}
    return null;
  });

  const [businessPhone, setBusinessPhone] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.businessPhone || null;
      }
    } catch (e) {}
    return null;
  });

  const [pendingConflict, setPendingConflict] = useState<{ item: MenuItem; business: BusinessCartInfo } | null>(null);
  const [isFloatingCartVisible, setIsFloatingCartVisible] = useState<boolean>(true);

  // Save cart to local storage whenever items or business change
  useEffect(() => {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          items,
          businessId,
          businessName,
          businessPhone
        })
      );
    } catch (e) {
      console.error('Failed to save cart to storage:', e);
    }
  }, [items, businessId, businessName, businessPhone]);

  // Total items count
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Total price
  const totalPrice = items.reduce((sum, item) => {
    const p = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    return sum + (p * item.quantity);
  }, 0);

  // Get quantity of a single item
  const getItemQuantity = (itemId: string) => {
    const found = items.find(i => i.id === itemId);
    return found ? found.quantity : 0;
  };

  // Add Item to cart with conflict resolution
  const addItem = (item: MenuItem, business: BusinessCartInfo) => {
    // Check if cart has items from another business
    if (items.length > 0 && businessId && businessId !== business.id) {
      // Trigger conflict modal
      setPendingConflict({ item, business });
      return;
    }

    // Same business or empty cart
    setBusinessId(business.id);
    setBusinessName(business.name);
    if (business.phone) setBusinessPhone(business.phone);

    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(i => i.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        return [
          ...prevItems,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            originalPrice: item.originalPrice,
            quantity: 1,
            category: item.category,
            image: item.imageUrl,
            options: item.options,
            businessId: business.id,
            businessName: business.name,
            businessPhone: business.phone
          }
        ];
      }
    });

    // Make floating cart visible when adding items
    setIsFloatingCartVisible(true);
  };

  // Confirm replacing old cart with new business items
  const confirmReplaceCart = () => {
    if (!pendingConflict) return;
    const { item, business } = pendingConflict;

    setItems([
      {
        id: item.id,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        quantity: 1,
        category: item.category,
        image: item.imageUrl,
        options: item.options,
        businessId: business.id,
        businessName: business.name,
        businessPhone: business.phone
      }
    ]);

    setBusinessId(business.id);
    setBusinessName(business.name);
    setBusinessPhone(business.phone || null);
    setPendingConflict(null);
    setIsFloatingCartVisible(true);
  };

  // Cancel adding item from new business and keep old cart intact
  const cancelConflict = () => {
    setPendingConflict(null);
  };

  // Remove single item completely
  const removeItem = (itemId: string) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== itemId);
      if (filtered.length === 0) {
        setBusinessId(null);
        setBusinessName(null);
        setBusinessPhone(null);
      }
      return filtered;
    });
  };

  // Update item quantity by delta (+1 or -1)
  const updateQuantity = (itemId: string, delta: number) => {
    setItems(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];

      if (updated.length === 0) {
        setBusinessId(null);
        setBusinessName(null);
        setBusinessPhone(null);
      }
      return updated;
    });
  };

  // Clear entire cart
  const clearCart = () => {
    setItems([]);
    setBusinessId(null);
    setBusinessName(null);
    setBusinessPhone(null);
    setPendingConflict(null);
  };

  const hideFloatingCart = () => {
    setIsFloatingCartVisible(false);
  };

  const showFloatingCart = () => {
    setIsFloatingCartVisible(true);
  };

  const toggleFloatingCart = () => {
    setIsFloatingCartVisible(prev => !prev);
  };

  const sendOrderViaWhatsapp = () => {
    if (items.length === 0 || !businessName) return;

    let phone = businessPhone ? businessPhone.replace(/[^0-9]/g, '') : '';
    if (phone.startsWith('07')) {
      phone = '962' + phone.substring(1);
    } else if (!phone.startsWith('962') && phone.length === 9) {
      phone = '962' + phone;
    }

    let messageText = `مرحباً ${businessName} 👋\nأود إرسال طلب حجز/شراء جديد عبر منصة *(شو في بإربد؟)*:\n\n*تفاصيل الطلب:*\n`;

    items.forEach((cartItem, idx) => {
      const p = typeof cartItem.price === 'number' ? cartItem.price : parseFloat(cartItem.price) || 0;
      const itemTotal = p * cartItem.quantity;
      const optionsText = cartItem.options && cartItem.options.length > 0 
        ? `   *(خيارات: ${cartItem.options.join(', ')})*\n` 
        : '';
      messageText += `${idx + 1}. *${cartItem.name}* \n   الكمية: [ ${cartItem.quantity} ] ✕ السعر: ${p} د.أ (الإجمالي: ${itemTotal.toFixed(2)} د.أ)\n${optionsText}`;
    });

    messageText += `\n💵 *الحساب الإجمالي التقريبي:* *${totalPrice.toFixed(2)} د.أ*\n`;
    messageText += `\n📍 يرجى تأكيد توافر هذا الحجز/الطلب وتجهيزه للتواصل المباشر والاستلام.`;

    const encodedMessage = encodeURIComponent(messageText);

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        businessId,
        businessName,
        businessPhone,
        pendingConflict,
        isFloatingCartVisible,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        confirmReplaceCart,
        cancelConflict,
        getItemQuantity,
        totalCount,
        totalPrice,
        setIsFloatingCartVisible,
        hideFloatingCart,
        showFloatingCart,
        toggleFloatingCart,
        sendOrderViaWhatsapp
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
