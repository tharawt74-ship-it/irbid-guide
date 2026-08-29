import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  User, Lock, Shield, Bell, Key, Mail, Phone, MapPin, 
  CheckCircle2, AlertCircle, ArrowRight, Save, RefreshCw, 
  Eye, EyeOff, LogOut, Trash2, Check, Sparkles, MessageSquare, 
  HelpCircle, ShieldCheck, Heart, Store
} from 'lucide-react';
import { 
  updateProfile, 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { IRBID_REGIONS_CATEGORIZED } from '../lib/categories';
import { UserPreferences } from '../types';

export function ProfileSettings() {
  const { currentUser, userProfile, refreshUserData, logout, isAdmin, isSupervisor } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'privacy' | 'account'>('general');

  // General Profile State
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('شارع الجامعة');
  const [bio, setBio] = useState('');
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Password / Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Preferences & Privacy State
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifyOffers: true,
    notifyJobs: true,
    notifyMessages: true,
    hidePublicActivity: false,
    allowDirectMessages: true
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSuccess, setPreferencesSuccess] = useState('');

  // Delete Account Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Load existing profile values
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || userProfile?.displayName || '');
      setPhone(userProfile?.phone || '');
      setDistrict(userProfile?.district || 'شارع الجامعة');
      setBio(userProfile?.bio || '');
      if (userProfile?.preferences) {
        setPreferences({
          notifyOffers: userProfile.preferences.notifyOffers ?? true,
          notifyJobs: userProfile.preferences.notifyJobs ?? true,
          notifyMessages: userProfile.preferences.notifyMessages ?? true,
          hidePublicActivity: userProfile.preferences.hidePublicActivity ?? false,
          allowDirectMessages: userProfile.preferences.allowDirectMessages ?? true
        });
      }
    }
  }, [currentUser, userProfile]);

  // If user is not logged in, redirect to login
  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6" dir="rtl">
        <div className="w-16 h-16 bg-[#1a4d2e]/10 text-[#1a4d2e] rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <Lock className="h-8 w-8 text-[#1a4d2e]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-stone-900">يرجى تسجيل الدخول أولاً</h2>
          <p className="text-sm text-stone-500">تحتاج لتسجيل الدخول إلى حسابك لتتمكن من تعديل الإعدادات والخصوصية.</p>
        </div>
        <Link
          to="/login"
          className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-md hover:bg-[#143d24] transition-all"
        >
          <span>تسجيل الدخول الآن</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Handle General Profile Update
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    setGeneralSuccess('');
    setGeneralError('');

    try {
      // 1. Update Firebase Auth Profile (Display Name)
      if (auth.currentUser && displayName.trim()) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim()
        });
      }

      // 2. Update Firestore User Document
      if (db && currentUser.uid) {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, {
          displayName: displayName.trim(),
          phone: phone.trim(),
          district: district,
          bio: bio.trim(),
          lastUpdated: Date.now()
        }, { merge: true });
      }

      await refreshUserData();
      setGeneralSuccess('تم تحديث معلوماتك الشخصية بنجاح!');
      setTimeout(() => setGeneralSuccess(''), 4000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setGeneralError(err.message || 'حدث خطأ أثناء حفظ المعلومات. يرجى المحاولة مرة أخرى.');
    } finally {
      setSavingGeneral(false);
    }
  };

  // Handle Password Update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('يجب أن تتكون كلمة المرور الجديدة من 6 خانات أو أكثر.');
      setSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين.');
      setSavingPassword(false);
      return;
    }

    try {
      if (!auth.currentUser || !currentUser.email) {
        throw new Error('المستخدم غير متصل حالياً.');
      }

      // Re-authenticate user before sensitive action
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      setPasswordSuccess('تم تغيير كلمة المرور بنجاح! احتفظ بها في مكان آمن.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err: any) {
      console.error('Password change error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('كلمة المرور الحالية غير صحيحة.');
      } else if (err.code === 'auth/requires-recent-login') {
        setPasswordError('يرجى إعادة تسجيل الدخول لتتمكن من تغيير كلمة المرور لأسباب أمنية.');
      } else {
        setPasswordError(err.message || 'حدث خطأ أثناء تغيير كلمة المرور.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Password Reset Email
  const handleSendResetEmail = async () => {
    if (!currentUser.email) return;
    setSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setResetEmailSent(true);
      setTimeout(() => setResetEmailSent(false), 8000);
    } catch (err: any) {
      console.error('Error sending reset email:', err);
      setPasswordError('تعذر إرسال رابط إعادة التعيين. يرجى المحاولة لاحقاً.');
    } finally {
      setSendingResetEmail(false);
    }
  };

  // Handle Preferences Save
  const handleTogglePreference = async (key: keyof UserPreferences) => {
    const updated = {
      ...preferences,
      [key]: !preferences[key]
    };
    setPreferences(updated);
    setSavingPreferences(true);

    try {
      if (db && currentUser.uid) {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, {
          preferences: updated,
          lastUpdated: Date.now()
        }, { merge: true });
      }
      await refreshUserData();
      setPreferencesSuccess('تم حفظ تفضيلاتك بنجاح');
      setTimeout(() => setPreferencesSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
    } finally {
      setSavingPreferences(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-16" dir="rtl">
      
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              to="/profile" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1a4d2e] hover:underline bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>العودة للملف الشخصي</span>
            </Link>
            <span className="text-stone-300">/</span>
            <span className="text-xs font-bold text-stone-500">إعدادات الحساب</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 flex items-center gap-2.5">
            <span>إعدادات الحساب والخصوصية</span>
            <Sparkles className="h-5 w-5 text-[#ff9f1c]" />
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            تحكم في معلوماتك الشخصية، كلمة المرور، تفضيلات الإشعارات، والخصوصية.
          </p>
        </div>

        {/* Quick User Badge */}
        <div className="flex items-center gap-3 bg-white p-2.5 px-4 rounded-2xl border border-stone-200 shadow-2xs self-start sm:self-auto">
          <div className="w-10 h-10 rounded-xl bg-[#1a4d2e]/10 text-[#1a4d2e] flex items-center justify-center font-black text-sm">
            {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs font-black text-stone-800 leading-tight">
              {currentUser.displayName || 'مستخدم إربد'}
            </span>
            <span className="text-[11px] text-stone-400 font-mono" dir="ltr">
              {currentUser.email}
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-100/80 p-1.5 rounded-2xl border border-stone-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-white text-[#1a4d2e] shadow-xs font-black'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
          }`}
        >
          <User className="h-4 w-4 shrink-0" />
          <span>المعلومات الشخصية</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-white text-[#1a4d2e] shadow-xs font-black'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
          }`}
        >
          <Key className="h-4 w-4 shrink-0" />
          <span>الأمان وكلمة المرور</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('privacy')}
          className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'privacy'
              ? 'bg-white text-[#1a4d2e] shadow-xs font-black'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
          }`}
        >
          <Shield className="h-4 w-4 shrink-0" />
          <span>الخصوصية والتواصل</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'account'
              ? 'bg-white text-red-600 shadow-xs font-black'
              : 'text-stone-600 hover:text-red-700 hover:bg-white/60'
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>إدارة الحساب</span>
        </button>
      </div>

      {/* Tab 1: General Personal Information */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white rounded-3xl border border-[#e5e1da] p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <User className="h-5 w-5 text-[#1a4d2e]" />
                <span>البيانات الأساسية للمستخدم</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">تظهر هذه المعلومات في تفاعلاتك ومراجعاتك داخل المنصة.</p>
            </div>
            {isAdmin ? (
              <span className="bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-xl border border-amber-200">
                مدير عام المنصة
              </span>
            ) : isSupervisor ? (
              <span className="bg-blue-100 text-blue-900 text-xs font-black px-3 py-1 rounded-xl border border-blue-200">
                مشرف معتمد
              </span>
            ) : null}
          </div>

          {generalSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{generalSuccess}</span>
            </div>
          )}

          {generalError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Display Name */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-stone-700">
                الاسم المعروض (الاسم الكامل) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: أحمد الشمالي"
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 text-sm font-bold text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email (Read only) */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-stone-700">
                البريد الإلكتروني المسجل
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={currentUser.email || ''}
                  className="w-full bg-stone-100 border border-stone-200 text-stone-500 rounded-2xl py-3 px-4 text-sm font-mono cursor-not-allowed"
                  dir="ltr"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-stone-200 text-stone-600 px-2 py-0.5 rounded-md">
                  غير قابل للتعديل المباشر
                </span>
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-stone-700">
                رقم الهاتف الشخصي (اختياري)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="079XXXXXXXX"
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 text-sm font-mono text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all"
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-stone-400">يستخدم للتواصل في حال إضافة وظائف أو طلب خدمات الترويج.</p>
            </div>

            {/* Preferred Irbid District / Area */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-stone-700">
                الحي / المنطقة المفضلة في إربد
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 text-sm font-bold text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all cursor-pointer"
              >
                {IRBID_REGIONS_CATEGORIZED.map((group) => (
                  <optgroup key={group.groupName} label={group.groupName}>
                    {group.areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Bio / About */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-stone-700">
              نبذة قصيرة عنك (Bio)
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب نبذة موجزة عن اهتماماتك أو مجالك..."
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="submit"
              disabled={savingGeneral}
              className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#143d24] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-md shadow-[#1a4d2e]/20 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <Save className="h-4 w-4" />
              <span>{savingGeneral ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Change Password Form */}
          <form onSubmit={handleSavePassword} className="bg-white rounded-3xl border border-[#e5e1da] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <Key className="h-5 w-5 text-[#1a4d2e]" />
                <span>تغيير كلمة المرور</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                تأكد من اختيار كلمة مرور قوية تحتوي على أحرف وأرقام لضمان حماية حسابك.
              </p>
            </div>

            {passwordSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-4 max-w-lg">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-stone-700">
                  كلمة المرور الحالية *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 pl-11 text-sm font-mono text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-stone-700">
                  كلمة المرور الجديدة *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 pl-11 text-sm font-mono text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-stone-400">يجب ألا تقل عن 6 خانات.</p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-stone-700">
                  تأكيد كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 text-sm font-mono text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={sendingResetEmail}
                className="text-xs font-bold text-stone-500 hover:text-[#1a4d2e] underline cursor-pointer"
              >
                {sendingResetEmail ? 'جاري إرسال الرابط...' : 'نسيت كلمة المرور؟ أرسل رابط إعادة التعيين لبريدي'}
              </button>

              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#143d24] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-md shadow-[#1a4d2e]/20 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <Key className="h-4 w-4" />
                <span>{savingPassword ? 'جاري التحديث...' : 'تحديث كلمة المرور'}</span>
              </button>
            </div>

            {resetEmailSent && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                <span>تم إرسال رابط إعادة تعيين كلمة المرور إلى {currentUser.email}. يرجى تفقد صندوق الوارد.</span>
              </div>
            )}
          </form>

          {/* Account Security Information Card */}
          <div className="bg-stone-50 rounded-3xl border border-stone-200/80 p-6 space-y-4">
            <h3 className="text-sm font-black text-stone-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>معلومات الأمان وتسجيل الدخول</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-3xs space-y-1">
                <span className="text-stone-400 font-medium">البريد الإلكتروني:</span>
                <p className="font-bold text-stone-800 font-mono break-all">{currentUser.email}</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-3xs space-y-1">
                <span className="text-stone-400 font-medium">تاريخ الإنشاء:</span>
                <p className="font-bold text-stone-800">
                  {currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString('ar-JO') : 'غير متوفر'}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-3xs space-y-1">
                <span className="text-stone-400 font-medium">آخر تسجيل دخول:</span>
                <p className="font-bold text-stone-800">
                  {currentUser.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString('ar-JO') : 'الآن'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Privacy & Communication */}
      {activeTab === 'privacy' && (
        <div className="bg-white rounded-3xl border border-[#e5e1da] p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#1a4d2e]" />
              <span>الخصوصية والتواصل والإشعارات</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              تحكم في كيفية ظهور نشاطك واستقبال الرسائل والإشعارات في منصة "شو في بإربد؟".
            </p>
          </div>

          {preferencesSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{preferencesSuccess}</span>
            </div>
          )}

          <div className="space-y-4 divide-y divide-stone-100">
            {/* Toggle: Direct Messages */}
            <div className="flex items-center justify-between pt-4 first:pt-0 gap-4">
              <div className="space-y-1 text-right">
                <span className="text-sm font-bold text-stone-800 block">
                  استقبال الرسائل والمحادثات المباشرة
                </span>
                <p className="text-xs text-stone-500">
                  السماح لأصحاب المحلات التجارية والزوار بالتواصل معك عبر الرسائل الفورية داخل المنصة.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference('allowDirectMessages')}
                className={`w-12 h-7 rounded-full transition-colors p-1 relative shrink-0 cursor-pointer ${
                  preferences.allowDirectMessages ? 'bg-[#1a4d2e]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    preferences.allowDirectMessages ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle: Hide Public Activity */}
            <div className="flex items-center justify-between pt-4 gap-4">
              <div className="space-y-1 text-right">
                <span className="text-sm font-bold text-stone-800 block">
                  إخفاء المراجعات والتقييمات من الملف العام
                </span>
                <p className="text-xs text-stone-500">
                  إخفاء تعليقاتك وتقييماتك للمحلات من صفحة ملفك الشخصي العامة (تبقى ظاهرة على صفحة المحل فقط).
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference('hidePublicActivity')}
                className={`w-12 h-7 rounded-full transition-colors p-1 relative shrink-0 cursor-pointer ${
                  preferences.hidePublicActivity ? 'bg-[#1a4d2e]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    preferences.hidePublicActivity ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle: Offer Notifications */}
            <div className="flex items-center justify-between pt-4 gap-4">
              <div className="space-y-1 text-right">
                <span className="text-sm font-bold text-stone-800 block">
                  إشعارات العروض والخصومات الكبرى
                </span>
                <p className="text-xs text-stone-500">
                  تلقي إشعارات فورية عند إطلاق محلات إربد لعروض وخصومات مميزة.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference('notifyOffers')}
                className={`w-12 h-7 rounded-full transition-colors p-1 relative shrink-0 cursor-pointer ${
                  preferences.notifyOffers ? 'bg-[#1a4d2e]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    preferences.notifyOffers ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle: Job Alerts */}
            <div className="flex items-center justify-between pt-4 gap-4">
              <div className="space-y-1 text-right">
                <span className="text-sm font-bold text-stone-800 block">
                  إشعارات الشواغر والوظائف الجديدة
                </span>
                <p className="text-xs text-stone-500">
                  تلقي تنبيهات عند نشر فرص عمل جديدة في محافظة إربد.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference('notifyJobs')}
                className={`w-12 h-7 rounded-full transition-colors p-1 relative shrink-0 cursor-pointer ${
                  preferences.notifyJobs ? 'bg-[#1a4d2e]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    preferences.notifyJobs ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Account Management & Danger Zone */}
      {activeTab === 'account' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Logout & Session Card */}
          <div className="bg-white rounded-3xl border border-[#e5e1da] p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <LogOut className="h-5 w-5 text-stone-700" />
                  <span>تسجيل الخروج من الحساب</span>
                </h3>
                <p className="text-xs text-stone-500">
                  إنهاء الجلسة الحالية والعودة للصفحة الرئيسية.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl border border-stone-200 transition-all cursor-pointer active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div className="bg-red-50/50 rounded-3xl border border-red-200/80 p-6 sm:p-8 space-y-4">
            <div className="border-b border-red-100 pb-3">
              <h3 className="text-base font-black text-red-900 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                <span>منطقة الخطر - حذف الحساب</span>
              </h3>
              <p className="text-xs text-red-700 mt-1">
                حذف حسابك نهائياً سيؤدي إلى إزالة تفضيلاتك وسجل نشاطك. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <p className="text-xs text-stone-600 leading-relaxed max-w-md">
                إذا كنت ترغب في حذف بياناتك بالكامل من "شو في بإربد؟"، يرجى تأكيد رغبتك. لن تتمكن من استعادة الحساب بعد الحذف.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm self-start sm:self-auto"
              >
                <Trash2 className="h-4 w-4" />
                <span>طلب حذف الحساب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[32px] sm:rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5 text-right animate-in slide-in-from-bottom-8 sm:zoom-in-95">
            <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto -mt-2 mb-2 sm:hidden" />
            
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-stone-900">تأكيد حذف الحساب</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                هل أنت متأكد تماماً من رغبتك في حذف حسابك؟ اكتب <span className="font-bold text-red-600 font-mono">حذف</span> في الحقل أدناه للمتابعة.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="اكتب كلمة: حذف"
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 text-center font-bold text-sm text-stone-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText.trim() !== 'حذف'}
                onClick={async () => {
                  try {
                    if (auth.currentUser) {
                      await auth.currentUser.delete();
                      navigate('/');
                    }
                  } catch (e: any) {
                    alert(e.message || 'يتطلب حذف الحساب إعادة تسجيل الدخول الحديثة لأسباب أمنية.');
                  }
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
