import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Check, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'تأكيد الحذف',
  message = 'هل أنت متأكد من تنفيذ هذا الإجراء؟ لا يمكن التراجع عنه.',
  confirmText = 'نعم، تأكيد',
  cancelText = 'إلغاء',
  variant = 'danger'
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-600" />;
      case 'info':
        return <Check className="h-6 w-6 text-blue-600" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100',
          btn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100',
          btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        };
    }
  };

  const styles = getVariantStyles();

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div 
        className="absolute inset-0 bg-stone-950/80 backdrop-blur-md transition-opacity" 
        onClick={!isProcessing ? onClose : undefined}
      />
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm relative z-10 flex flex-col max-h-[88dvh] sm:max-h-[85vh] overflow-hidden my-0 sm:my-auto animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        <div className="p-5 sm:p-6 text-center overflow-y-auto flex-1 min-h-0">
          <div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4", styles.iconBg)}>
            {getIcon()}
          </div>
          <h3 className="text-lg font-bold text-stone-900 mb-2">
            {title}
          </h3>
          <p className="text-sm text-stone-500">
            {message}
          </p>
        </div>
        
        <div className="bg-stone-50 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row-reverse gap-2 shrink-0 border-t border-stone-100 sticky bottom-0 z-10">
          <button
            type="button"
            className={cn(
              "w-full inline-flex justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto transition-colors disabled:opacity-70 disabled:cursor-not-allowed",
              styles.btn
            )}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري المعالجة...
              </span>
            ) : (
              confirmText
            )}
          </button>
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 shadow-sm hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 sm:w-auto transition-colors"
            onClick={onClose}
            disabled={isProcessing}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
