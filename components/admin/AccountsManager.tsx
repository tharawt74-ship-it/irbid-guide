import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, Search, Filter, ShieldCheck, UserCheck, UserX, 
  Plus, Edit3, Trash2, Mail, Phone, Calendar, Lock, Unlock, 
  Store, Shield, Send, Check, X, Eye, AlertTriangle, Sparkles,
  CheckCircle2, RefreshCw
} from 'lucide-react';

export function AccountsManager() {
  const { currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toastMsg, setToastMsg] = useState<{ text: string; type?: 'success' | 'error' | 'info' } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<UserProfile | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserProfile | null>(null);
  const [selectedUserForMessage, setSelectedUserForMessage] = useState<UserProfile | null>(null);

  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    phone: '',
    role: 'user' as UserRole,
    status: 'active' as 'active' | 'suspended'
  });

  const [editRole, setEditRole] = useState<UserRole>('user');
  const [suspendReason, setSuspendReason] = useState('');
  const [directMsg, setDirectMsg] = useState({ title: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const ADMIN_BOOTSTRAP_EMAILS = [
    'princessofx2344@gmail.com',
    'admin@shoofiirbid.com',
    'irbid.admin@gmail.com'
  ];

  // Fetch all user accounts from Firestore
  const fetchUsers = async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const fetchedMap = new Map<string, UserProfile>();

      snap.forEach(d => {
        const data = d.data();
        const userEmail = (data.email || '').toLowerCase().trim();
        const isBootstrapAdmin = ADMIN_BOOTSTRAP_EMAILS.some(e => e.toLowerCase() === userEmail);
        
        let userRole: UserRole = data.role || 'user';
        if (isBootstrapAdmin) {
          userRole = 'super_admin';
          // Auto repair outdated role in Firestore if needed
          if (data.role !== 'super_admin') {
            setDoc(doc(db, 'users', d.id), { role: 'super_admin' }, { merge: true }).catch(console.warn);
          }
        }

        fetchedMap.set(d.id, {
          uid: d.id,
          email: data.email || 'بدون بريد',
          displayName: data.displayName || data.email?.split('@')[0] || 'مستخدم إربد',
          role: userRole,
          phone: data.phone || '',
          status: data.status || 'active',
          statusReason: data.statusReason || '',
          photoURL: data.photoURL || '',
          createdAt: data.createdAt || Date.now(),
          lastLoginAt: data.lastLoginAt || data.createdAt,
          isMerchant: data.isMerchant || userRole === 'merchant',
          merchantBusinessIds: data.merchantBusinessIds || [],
          savedFavorites: data.savedFavorites || []
        });
      });

      // Also check supervisors collection to include any supervisors created separately
      try {
        const supSnap = await getDocs(collection(db, 'supervisors'));
        supSnap.forEach(d => {
          const supData = d.data();
          if (!fetchedMap.has(d.id)) {
            fetchedMap.set(d.id, {
              uid: d.id,
              email: supData.email || 'بدون بريد',
              displayName: supData.displayName || 'مشرف معتمد',
              role: supData.role || 'supervisor',
              phone: supData.phone || '',
              status: 'active',
              createdAt: supData.createdAt || Date.now(),
              lastLoginAt: supData.createdAt || Date.now(),
              supervisorPermissions: supData.permissions
            });
          }
        });
      } catch (err) {
        console.warn('Supervisors sync check error:', err);
      }

      // Ensure current logged-in user is included with correct profile & super_admin role if admin
      if (currentUser && currentUser.email) {
        const curEmail = currentUser.email.toLowerCase().trim();
        const isCurAdmin = ADMIN_BOOTSTRAP_EMAILS.some(e => e.toLowerCase() === curEmail);
        const existing = fetchedMap.get(currentUser.uid);
        
        const updatedProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || existing?.displayName || curEmail.split('@')[0] || 'مدير النظام',
          role: isCurAdmin ? 'super_admin' : (existing?.role || 'user'),
          phone: existing?.phone || '',
          status: existing?.status || 'active',
          statusReason: existing?.statusReason || '',
          photoURL: currentUser.photoURL || existing?.photoURL || '',
          createdAt: existing?.createdAt || Date.now(),
          lastLoginAt: Date.now(),
          isMerchant: existing?.isMerchant || false,
          merchantBusinessIds: existing?.merchantBusinessIds || [],
          savedFavorites: existing?.savedFavorites || []
        };

        fetchedMap.set(currentUser.uid, updatedProfile);

        // Auto sync current user document to firestore
        setDoc(doc(db, 'users', currentUser.uid), {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: updatedProfile.displayName,
          role: updatedProfile.role,
          status: updatedProfile.status,
          createdAt: updatedProfile.createdAt,
          lastLoginAt: Date.now()
        }, { merge: true }).catch(console.warn);
      }

      const fetchedList = Array.from(fetchedMap.values());
      // Sort by creation time desc
      fetchedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setUsers(fetchedList);
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('حدث خطأ أثناء تحميل الحسابات من الخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered users
  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      u.displayName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.phone && u.phone.includes(query)) ||
      u.uid.toLowerCase().includes(query);

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (u.status || 'active') === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle Add New User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !newUser.email || !newUser.displayName) return;
    setSubmitting(true);
    try {
      const newUid = `user_${Date.now()}`;
      const payload: UserProfile = {
        uid: newUid,
        email: newUser.email.trim().toLowerCase(),
        displayName: newUser.displayName.trim(),
        phone: newUser.phone.trim(),
        role: newUser.role,
        status: newUser.status,
        createdAt: Date.now(),
        isMerchant: newUser.role === 'merchant',
        savedFavorites: []
      };

      await setDoc(doc(db, 'users', newUid), payload);
      setUsers(prev => [payload, ...prev]);
      setIsAddModalOpen(false);
      setNewUser({ email: '', displayName: '', phone: '', role: 'user', status: 'active' });
      showToast('تمت إضافة الحساب الجديد بنجاح في قاعدة البيانات.');
    } catch (err) {
      console.error('Error adding user:', err);
      showToast('فشل إضافة الحساب، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Update Role
  const handleSaveRole = async () => {
    if (!db || !selectedUserForEdit) return;
    setSubmitting(true);
    try {
      const isMerch = editRole === 'merchant';
      await updateDoc(doc(db, 'users', selectedUserForEdit.uid), {
        role: editRole,
        isMerchant: isMerch
      });

      // If promoted to supervisor, ensure supervisor doc exists
      if (editRole === 'supervisor' || editRole === 'super_admin') {
        await setDoc(doc(db, 'supervisors', selectedUserForEdit.uid), {
          uid: selectedUserForEdit.uid,
          email: selectedUserForEdit.email,
          displayName: selectedUserForEdit.displayName,
          role: editRole,
          createdAt: Date.now(),
          permissions: {
            canApproveShops: true,
            canModerateJobs: true,
            canModerateReviews: true,
            canManageBanners: true
          }
        }, { merge: true });
      }

      setUsers(prev => prev.map(u => u.uid === selectedUserForEdit.uid ? { ...u, role: editRole, isMerchant: isMerch } : u));
      setSelectedUserForEdit(null);
      showToast(`تم تعديل رتبة الحساب إلى (${getRoleLabel(editRole)}) بنجاح.`);
    } catch (err) {
      console.error('Error updating user role:', err);
      showToast('حدث خطأ أثناء تغيير رتبة الحساب', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Status (Active / Suspended)
  const handleToggleStatus = async () => {
    if (!db || !selectedUserForStatus) return;
    setSubmitting(true);
    const newStatus = selectedUserForStatus.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateDoc(doc(db, 'users', selectedUserForStatus.uid), {
        status: newStatus,
        statusReason: newStatus === 'suspended' ? suspendReason : ''
      });

      setUsers(prev => prev.map(u => u.uid === selectedUserForStatus.uid ? { ...u, status: newStatus, statusReason: suspendReason } : u));
      setSelectedUserForStatus(null);
      setSuspendReason('');
      showToast(newStatus === 'suspended' ? 'تم إيقاف الحساب وتجميد صلاحياته' : 'تم إعادة تنشيط الحساب بنجاح');
    } catch (err) {
      console.error('Error toggling status:', err);
      showToast('حدث خطأ أثناء تعديل حالة الحساب', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Send Direct Message
  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !selectedUserForMessage || !directMsg.title || !directMsg.text) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: selectedUserForMessage.uid,
        title: directMsg.title.trim(),
        message: directMsg.text.trim(),
        type: 'system',
        createdAt: Date.now(),
        isRead: false
      });

      setSelectedUserForMessage(null);
      setDirectMsg({ title: '', text: '' });
      showToast('تم إرسال الرسالة المباشرة إلى صندوق وارد المستخدم.');
    } catch (err) {
      console.error('Error sending message:', err);
      showToast('فشل إرسال الرسالة للمستخدم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: UserProfile) => {
    if (!db || !isAdmin) return;
    if (!confirm(`هل أنت متأكد من حذف حساب (${user.displayName}) نهائياً من قاعدة البيانات؟`)) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid));
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
      showToast(`تم حذف الحساب (${user.displayName}) نهائياً.`);
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast('حدث خطأ أثناء حذف الحساب', 'error');
    }
  };

  // Helper for Role labels
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-black inline-flex items-center gap-1"><Shield className="h-3 w-3 text-purple-600" /> مدير عام</span>;
      case 'supervisor':
        return <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-600" /> مشرف موثق</span>;
      case 'merchant':
        return <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1"><Store className="h-3 w-3 text-amber-600" /> صاحب محل</span>;
      default:
        return <span className="bg-stone-100 text-stone-700 border border-stone-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1"><Users className="h-3 w-3 text-stone-500" /> مستخدم</span>;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'مدير عام المنصة';
      case 'supervisor': return 'مشرف معتمد';
      case 'merchant': return 'صاحب محل تجاري';
      default: return 'مستخدم عادي';
    }
  };

  // Stats calculation
  const totalAccounts = users.length;
  const merchantsCount = users.filter(u => u.role === 'merchant' || u.isMerchant).length;
  const staffCount = users.filter(u => u.role === 'supervisor' || u.role === 'super_admin').length;
  const suspendedCount = users.filter(u => u.status === 'suspended').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in ${
          toastMsg.type === 'error' ? 'bg-red-50 text-red-900 border-red-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="p-1 text-stone-400 hover:text-stone-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-sky-50 text-sky-700 font-bold">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-stone-900">إدارة جميع الحسابات والمستخدمين</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            سجل كامل لكافة الحسابات المسجلة في دليل إربد، التحكم في الرتب، توثيق أصحاب المحلات، وإدارة الحالات.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 text-[#ff9f1c]" />
              <span>إنشاء حساب جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
            <span>إجمالي الحسابات</span>
            <Users className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900">{totalAccounts}</div>
          <p className="text-[11px] text-stone-500">حسابات موثقة ومسجلة في النظام</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
            <span>أصحاب المحلات</span>
            <Store className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900">{merchantsCount}</div>
          <p className="text-[11px] text-stone-500">يمتلكون بطاقات تجارية في إربد</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
            <span>الهيئة الإشرافية</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900">{staffCount}</div>
          <p className="text-[11px] text-stone-500">مدراء ومشرفون بصلاحيات خاصة</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
            <span>الحسابات الموقوفة</span>
            <UserX className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900">{suspendedCount}</div>
          <p className="text-[11px] text-stone-500">تم تجميدها مؤقتاً أو نهائياً</p>
        </div>
      </div>

      {/* Toolbar: Search and Filters */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center gap-3 justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، البريد الإلكتروني، أو الهاتف..."
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl pr-10 pl-4 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-2xl text-xs font-bold">
            <Filter className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="bg-transparent text-stone-700 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">جميع الرتب ({users.length})</option>
              <option value="user">المستخدمين العاديين</option>
              <option value="merchant">أصحاب المحلات</option>
              <option value="supervisor">المشرفين المعتمدين</option>
              <option value="super_admin">المدراء العامين</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-2xl text-xs font-bold">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-stone-700 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="suspended">الموقوفة فقط</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table / List */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 space-y-3">
          <RefreshCw className="h-8 w-8 text-[#1a4d2e] animate-spin mx-auto" />
          <p className="text-xs font-bold text-stone-500">جاري تحميل وسحب بيانات الحسابات من قاعدة البيانات...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 space-y-3">
          <Users className="h-12 w-12 text-stone-300 mx-auto" />
          <h4 className="font-bold text-stone-700 text-sm">لم يتم العثور على أية حسابات مطابقة للبحث</h4>
          <p className="text-xs text-stone-400">جرب تغيير كلمات البحث أو إعادة ضبط الفلاتر المختارة</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold">
                <tr>
                  <th className="py-3.5 px-4">المستخدم والبريد</th>
                  <th className="py-3.5 px-4">الهاتف</th>
                  <th className="py-3.5 px-4">الرتبة</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4">تاريخ التسجيل</th>
                  <th className="py-3.5 px-4 text-center">التحكم والإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.map(user => {
                  const isSuspended = user.status === 'suspended';
                  return (
                    <tr key={user.uid} className={`hover:bg-stone-50/80 transition-colors ${isSuspended ? 'bg-rose-50/30' : ''}`}>
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                            user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'supervisor' ? 'bg-emerald-100 text-emerald-800' :
                            user.role === 'merchant' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black text-stone-900 flex items-center gap-1.5">
                              <span>{user.displayName}</span>
                              {user.uid === currentUser?.uid && (
                                <span className="bg-sky-100 text-sky-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">أنت</span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-400 font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-stone-600">
                        {user.phone ? <span dir="ltr">{user.phone}</span> : <span className="text-stone-300">-</span>}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isSuspended ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1" title={user.statusReason}>
                            <Lock className="h-3 w-3" /> موقوف
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> نشط
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-stone-500 text-[11px]">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-JO') : 'غير محدد'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => setSelectedUserForDetails(user)}
                            className="p-1.5 text-stone-500 hover:text-[#1a4d2e] hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                            title="تفاصيل الحساب الكاملة"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Change Role */}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setSelectedUserForEdit(user);
                                setEditRole(user.role);
                              }}
                              className="p-1.5 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                              title="تغيير الرتبة والصلاحيات"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Send Direct Message */}
                          <button
                            onClick={() => setSelectedUserForMessage(user)}
                            className="p-1.5 text-stone-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors cursor-pointer"
                            title="إرسال رسالة مباشرة إلى إشعاراته"
                          >
                            <Send className="h-4 w-4" />
                          </button>

                          {/* Suspend / Reactivate */}
                          {isAdmin && user.uid !== currentUser?.uid && (
                            <button
                              onClick={() => {
                                setSelectedUserForStatus(user);
                                setSuspendReason(user.statusReason || '');
                              }}
                              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                                isSuspended 
                                  ? 'text-emerald-600 hover:bg-emerald-50' 
                                  : 'text-stone-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={isSuspended ? 'تنشيط الحساب' : 'إيقاف/تجميد الحساب'}
                            >
                              {isSuspended ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </button>
                          )}

                          {/* Delete User */}
                          {isAdmin && user.uid !== currentUser?.uid && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="حذف الحساب نهائياً"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Add New User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-lg text-stone-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#1a4d2e]" />
                <span>إضافة وتوثيق حساب جديد</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 mb-1 block">اسم المستخدم الثلاثي *</label>
                <input
                  type="text"
                  required
                  value={newUser.displayName}
                  onChange={e => setNewUser({ ...newUser, displayName: e.target.value })}
                  placeholder="مثال: أحمد عبد الله المحمود"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 mb-1 block">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 mb-1 block">رقم الهاتف التواصل (اختياري)</label>
                <input
                  type="text"
                  value={newUser.phone}
                  onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="0791234567"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 mb-1 block">رتبة الحساب في المنصة</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                >
                  <option value="user">مستخدم عادي (Visitor / Buyer)</option>
                  <option value="merchant">صاحب محل تجاري (Merchant)</option>
                  <option value="supervisor">مشرف معتمد (Supervisor)</option>
                  <option value="super_admin">مدير عام للمنصة (Admin)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl font-black shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'إنشاء الحساب الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Change Role Modal */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-black text-base text-stone-900">تعديل رتبة وصلاحيات الحساب</h3>
                <p className="text-xs text-stone-500">{selectedUserForEdit.displayName} ({selectedUserForEdit.email})</p>
              </div>
              <button onClick={() => setSelectedUserForEdit(null)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <label className="font-bold text-stone-700 block">اختر الرتبة الجديدة:</label>
              <div className="space-y-2">
                {[
                  { id: 'user', label: 'مستخدم عادي', desc: 'تصفح المحلات، حفظ المفضلة، نشر التقييمات' },
                  { id: 'merchant', label: 'صاحب محل تجاري', desc: 'إدارة بطاقة المحل، قائمة المنيو، نشر الوظائف والعروض' },
                  { id: 'supervisor', label: 'مشرف معتمد', desc: 'مراجعة الملاحظات والطلبات وإدارة التقييمات' },
                  { id: 'super_admin', label: 'مدير عام المنصة', desc: 'صلاحيات كاملة غير محدودة على كل النظام' },
                ].map(item => (
                  <label
                    key={item.id}
                    onClick={() => setEditRole(item.id as UserRole)}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      editRole === item.id ? 'bg-emerald-50/60 border-[#1a4d2e] ring-1 ring-[#1a4d2e]' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleOption"
                      checked={editRole === item.id}
                      onChange={() => setEditRole(item.id as UserRole)}
                      className="mt-0.5 text-[#1a4d2e]"
                    />
                    <div>
                      <div className="font-black text-stone-900">{item.label}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveRole}
                  disabled={submitting}
                  className="px-5 py-2 bg-[#1a4d2e] text-white rounded-xl font-black shadow-xs cursor-pointer"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ الرتبة الجديدة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Suspend / Reactivate Status Modal */}
      {selectedUserForStatus && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                {selectedUserForStatus.status === 'suspended' ? (
                  <Unlock className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Lock className="h-5 w-5 text-rose-600" />
                )}
                <span>{selectedUserForStatus.status === 'suspended' ? 'إعادة تنشيط الحساب' : 'إيقاف وتجميد الحساب'}</span>
              </h3>
              <button onClick={() => setSelectedUserForStatus(null)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              أنت على وشك {selectedUserForStatus.status === 'suspended' ? 'إعادة تنشيط' : 'إيقاف'} حساب <span className="font-bold text-stone-900">{selectedUserForStatus.displayName}</span>.
            </p>

            {selectedUserForStatus.status !== 'suspended' && (
              <div>
                <label className="font-bold text-xs text-stone-700 mb-1 block">سبب الإيقاف (يظهر للمستخدم):</label>
                <textarea
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  placeholder="مثال: مخالفة شروط النشر أو إساءة استخدام المنصة..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-bold text-stone-800 h-24 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedUserForStatus(null)}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold cursor-pointer text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={submitting}
                className={`px-5 py-2 rounded-xl font-black text-xs text-white shadow-xs cursor-pointer ${
                  selectedUserForStatus.status === 'suspended' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'جاري المعالجة...' : selectedUserForStatus.status === 'suspended' ? 'تأكيد التنشيط' : 'تأكيد الإيقاف والتجميد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Send Direct Message Modal */}
      {selectedUserForMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <Send className="h-5 w-5 text-purple-600" />
                <span>إرسال إشعار خاص ومباشر</span>
              </h3>
              <button onClick={() => setSelectedUserForMessage(null)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-stone-500">
              سيصل هذا الإشعار المباشر فوراً إلى حساب: <span className="font-bold text-stone-900">{selectedUserForMessage.displayName}</span>
            </div>

            <form onSubmit={handleSendDirectMessage} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 mb-1 block">عنوان الإشعار *</label>
                <input
                  type="text"
                  required
                  value={directMsg.title}
                  onChange={e => setDirectMsg({ ...directMsg, title: e.target.value })}
                  placeholder="مثال: تم قبول توثيق محلك التجاري"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 mb-1 block">نص الرسالة والتفاصيل *</label>
                <textarea
                  required
                  value={directMsg.text}
                  onChange={e => setDirectMsg({ ...directMsg, text: e.target.value })}
                  placeholder="اكتب تفاصيل الرسالة الإدارية هنا..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 font-bold text-stone-800 h-24 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForMessage(null)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-black shadow-xs cursor-pointer"
                >
                  {submitting ? 'جاري الإرسال...' : 'إرسال الإشعار الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: View Full Details Modal */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1a4d2e] text-white flex items-center justify-center font-black text-sm">
                  {selectedUserForDetails.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">{selectedUserForDetails.displayName}</h3>
                  <p className="text-xs text-stone-500 font-mono">{selectedUserForDetails.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUserForDetails(null)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="text-stone-400 font-bold block">رتبة الحساب:</span>
                {getRoleBadge(selectedUserForDetails.role)}
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="text-stone-400 font-bold block">حالة الحساب:</span>
                <span className="font-bold text-stone-800">{selectedUserForDetails.status === 'suspended' ? '❌ موقوف' : '✅ نشط'}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="text-stone-400 font-bold block">رقم الهاتف:</span>
                <span className="font-bold font-mono text-stone-800">{selectedUserForDetails.phone || 'غير مسجل'}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="text-stone-400 font-bold block">تاريخ التسجيل:</span>
                <span className="font-bold text-stone-800">{selectedUserForDetails.createdAt ? new Date(selectedUserForDetails.createdAt).toLocaleString('ar-JO') : 'غير محدد'}</span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1 text-xs">
              <span className="text-stone-400 font-bold block">المعرف UID:</span>
              <span className="font-mono text-[11px] text-stone-700 select-all font-bold">{selectedUserForDetails.uid}</span>
            </div>

            {selectedUserForDetails.statusReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-rose-900 block">سبب الإيقاف المسجل:</span>
                <p className="text-rose-800">{selectedUserForDetails.statusReason}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedUserForDetails(null)}
                className="px-5 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
