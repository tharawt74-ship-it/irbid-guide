import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireStaff?: boolean;
}

export function ProtectedRoute({ children, requireStaff = false }: ProtectedRouteProps) {
  const { currentUser, isStaff, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-stone-50 space-y-4" dir="rtl">
        <div className="w-12 h-12 rounded-full border-4 border-[#1a4d2e]/20 border-t-[#1a4d2e] animate-spin"></div>
        <p className="text-sm font-bold text-stone-600">جاري التحقق من الصلاحيات والاتصال الآمن...</p>
      </div>
    );
  }

  if (!currentUser) {
    // Redirect to login page but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireStaff && !isStaff) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6" dir="rtl">
        <div className="w-20 h-20 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-md">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-stone-800">عذراً، غير مصرح بالدخول</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            هذا القسم مخصص لإدارة المنصة والمشرفين المعتمدين فقط. تم اتخاذ تدابير أمنية صارمة لمنع الوصول غير المصرح به لبيانات المستخدمين والمحلات التجارية.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
