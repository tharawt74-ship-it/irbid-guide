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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" 
        onClick={!isProcessing ? onClose : undefined}
      />
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden"
        dir="rtl"
      >
        <div className="p-5 sm:p-6 text-center">
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
        
        <div className="bg-stone-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse sm:gap-2">
          <button
            type="button"
            className={cn(
              "w-full inline-flex justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto transition-colors disabled:opacity-70 disabled:cursor-not-allowed",
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
            className="mt-3 w-full inline-flex justify-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 shadow-sm hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 sm:mt-0 sm:w-auto transition-colors"
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
