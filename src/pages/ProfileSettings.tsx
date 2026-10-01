import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  User, Lock, Shield, Bell, Key, Mail, Phone, MapPin, 
  CheckCircle2, AlertCircle, ArrowRight, Save, RefreshCw, 
  Eye, EyeOff, LogOut, Trash2, Check, MessageSquare, 
  HelpCircle, ShieldCheck
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  // If user is not logged in
  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6" dir="rtl">
        <div className="w-16 h-16 bg-[#1a4d2e]/10 text-[#1a4d2e] rounded-3xl flex items-center justify-center mx-auto shadow-xs">
          <Lock className="h-8 w-8 text-[#1a4d2e]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-stone-900">تسجيل الدخول مطلوب</h2>
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
      if (auth.currentUser && displayName.trim()) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim()
        });
      }

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
      setGeneralSuccess('تم تحديث معلوماتك الشخصية بنجاح');
      setTimeout(() => setGeneralSuccess(''), 4000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setGeneralError(err.message || 'حدث خطأ أثناء حفظ المعلومات');
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
      setPasswordError('كلمة المرور يجب أن لا تقل عن 6 خانات');
      setSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين');
      setSavingPassword(false);
      return;
    }

    try {
      if (!auth.currentUser || !currentUser.email) {
        throw new Error('المستخدم غير متصل حالياً');
      }

      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      setPasswordSuccess('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err: any) {
      console.error('Password change error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('كلمة المرور الحالية غير صحيحة');
      } else if (err.code === 'auth/requires-recent-login') {
        setPasswordError('يرجى إعادة تسجيل الدخول لتغيير كلمة المرور');
      } else {
        setPasswordError(err.message || 'حدث خطأ أثناء تغيير كلمة المرور');
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
      console.warn('Error sending reset email:', err);
      if (err?.code === 'auth/too-many-requests' || err?.message?.includes('too-many-requests')) {
        setPasswordError('تم إرسال عدة طلبات مؤخراً. يرجى الانتظار قليلاً');
      } else {
        setPasswordError('تعذر إرسال رابط إعادة التعيين');
      }
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
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16" dir="rtl">
      
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
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
            إعدادات الحساب والخصوصية
          </h1>
        </div>

        {/* User Card */}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-100 p-1.5 rounded-2xl border border-stone-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-white text-[#1a4d2e] shadow-2xs font-black'
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
              ? 'bg-white text-[#1a4d2e] shadow-2xs font-black'
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
              ? 'bg-white text-[#1a4d2e] shadow-2xs font-black'
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
              ? 'bg-white text-rose-600 shadow-2xs font-black'
              : 'text-stone-600 hover:text-rose-700 hover:bg-white/60'
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>إدارة الحساب</span>
        </button>
      </div>

      {/* Tab 1: General Personal Information */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-2xs space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <User className="h-5 w-5 text-[#1a4d2e]" />
              <span>البيانات الأساسية للمستخدم</span>
            </h2>
          </div>

          {generalSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-bold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{generalSuccess}</span>
            </div>
          )}

          {generalError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-bold">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-stone-700">
                الاسم المعروض
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="الاسم الكامل"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-sm font-bold text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-stone-700">
                البريد الإلكتروني المسجل
              </label>
              <input
                type="email"
                disabled
                value={currentUser.email || ''}
                className="w-full bg-stone-100 border border-stone-200 text-stone-500 rounded-xl py-3 px-4 text-sm font-mono cursor-not-allowed"
                dir="ltr"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-stone-700">
                رقم الهاتف الشخصي
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="079XXXXXXXX"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-sm font-mono text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all"
                dir="ltr"
              />
            </div>

            {/* Preferred District */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-stone-700">
                الحي أو المنطقة المفضلة في إربد
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-sm font-bold text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all cursor-pointer"
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
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-stone-700">
              نبذة شخصية
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب نبذة موجزة..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-stone-100">
            <button
              type="submit"
              disabled={savingGeneral}
              className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#143d24] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-98"
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
          <form onSubmit={handleSavePassword} className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <Key className="h-5 w-5 text-[#1a4d2e]" />
                <span>تغيير كلمة المرور</span>
              </h2>
            </div>

            {passwordSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-bold">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-bold">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-4 max-w-lg">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-stone-700">
                  كلمة المرور الحالية
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 pl-11 text-sm font-mono text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-stone-700">
                  كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 pl-11 text-sm font-mono text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-stone-700">
                  تأكيد كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 pl-11 text-sm font-mono text-stone-900 focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/10 outline-none transition-all"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={sendingResetEmail}
                className="text-xs font-bold text-stone-500 hover:text-[#1a4d2e] underline cursor-pointer"
              >
                {sendingResetEmail ? 'جاري إرسال الرابط...' : 'نسيت كلمة المرور؟ أرسل رابط إعادة التعيين'}
              </button>

              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#143d24] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <Key className="h-4 w-4" />
                <span>{savingPassword ? 'جاري التحديث...' : 'تحديث كلمة المرور'}</span>
              </button>
            </div>

            {resetEmailSent && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                <span>تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني</span>
              </div>
            )}
          </form>

          {/* Account Security Info */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-black text-stone-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>معلومات الحساب</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-1">
                <span className="text-stone-400 font-medium block">البريد الإلكتروني:</span>
                <p className="font-bold text-stone-800 font-mono break-all">{currentUser.email}</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-1">
                <span className="text-stone-400 font-medium block">تاريخ الانضمام:</span>
                <p className="font-bold text-stone-800">
                  {currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString('ar-JO') : 'غير متوفر'}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-1">
                <span className="text-stone-400 font-medium block">آخر تسجيل دخول:</span>
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
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-2xs space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#1a4d2e]" />
              <span>الخصوصية والإشعارات</span>
            </h2>
          </div>

          {preferencesSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-bold">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{preferencesSuccess}</span>
            </div>
          )}

          <div className="space-y-4 divide-y divide-stone-100">
            {/* Toggle: Direct Messages */}
            <div className="flex items-center justify-between pt-4 first:pt-0 gap-4">
              <span className="text-sm font-bold text-stone-800 block">
                استقبال الرسائل المباشرة
              </span>
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
              <span className="text-sm font-bold text-stone-800 block">
                إخفاء المراجعات والتقييمات من الملف العام
              </span>
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
              <span className="text-sm font-bold text-stone-800 block">
                إشعارات العروض والخصومات
              </span>
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
              <span className="text-sm font-bold text-stone-800 block">
                إشعارات الوظائف والشواغر
              </span>
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

      {/* Tab 4: Account Management */}
      {activeTab === 'account' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Logout */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <LogOut className="h-5 w-5 text-stone-700" />
                <span>تسجيل الخروج</span>
              </h3>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl border border-stone-200 transition-all cursor-pointer active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                <span>تسجيل الخروج الآن</span>
              </button>
            </div>
          </div>

          {/* Delete Account */}
          <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-6 sm:p-8 space-y-4">
            <div className="border-b border-rose-100 pb-3">
              <h3 className="text-base font-black text-rose-900 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-600" />
                <span>حذف الحساب</span>
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <p className="text-xs text-stone-600 font-bold">
                تأكيد حذف حسابك نهائياً من المنصة.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs self-start sm:self-auto"
              >
                <Trash2 className="h-4 w-4" />
                <span>طلب حذف الحساب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5 text-right animate-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-stone-900">تأكيد حذف الحساب</h3>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="اكتب كلمة: حذف"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-center font-bold text-sm text-stone-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
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
                    alert(e.message || 'يتطلب حذف الحساب إعادة تسجيل الدخول لتأكيد الأمان');
                  }
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
