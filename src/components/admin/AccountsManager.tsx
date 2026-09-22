import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { UserProfile, UserRole, Business } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, Search, Filter, ShieldCheck, UserCheck, UserX, 
  Plus, Edit3, Trash2, Mail, Phone, Calendar, Lock, Unlock, 
  Store, Shield, Send, Check, X, Eye, AlertTriangle, Sparkles,
  CheckCircle2, RefreshCw, Stethoscope
} from 'lucide-react';

interface AccountsManagerProps {
  businesses?: Business[];
}

export function AccountsManager({ businesses: initialBusinesses = [] }: AccountsManagerProps = {}) {
  const { currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>(initialBusinesses);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toastMsg, setToastMsg] = useState<{ text: string; type?: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (initialBusinesses && initialBusinesses.length > 0) {
      setAllBusinesses(initialBusinesses);
    }
  }, [initialBusinesses]);

  // Selection states
  const [selectedUids, setSelectedUids] = useState<string[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<UserProfile | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserProfile | null>(null);
  const [selectedUserForMessage, setSelectedUserForMessage] = useState<UserProfile | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserProfile | null>(null);

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

  const handleBulkChangeStatus = async (status: 'active' | 'suspended') => {
    if (selectedUids.length === 0) return;
    const reason = status === 'suspended' ? window.prompt('أدخل سبب إيقاف الحسابات المحدد جماعياً:', 'مخالفة معايير النشر') : '';
    if (status === 'suspended' && reason === null) return;

    try {
      setLoading(true);
      for (const uid of selectedUids) {
        if (uid === currentUser?.uid) continue;
        await updateDoc(doc(db, 'users', uid), {
          status,
          statusReason: reason || ''
        });
      }
      showToast(status === 'suspended' ? 'تم إيقاف الحسابات المحددة بنجاح' : 'تم تنشيط الحسابات المحددة بنجاح', 'success');
      setSelectedUids([]);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تحديث حالة الحسابات جماعياً', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkChangeRole = async (newRole: UserRole) => {
    if (selectedUids.length === 0) return;
    try {
      setLoading(true);
      for (const uid of selectedUids) {
        if (uid === currentUser?.uid) continue;
        const isMerch = newRole === 'merchant';
        await updateDoc(doc(db, 'users', uid), {
          role: newRole,
          isMerchant: isMerch
        });
        
        if (newRole === 'supervisor') {
          const userObj = users.find(u => u.uid === uid);
          if (userObj) {
            await setDoc(doc(db, 'supervisors', uid), {
              uid,
              email: userObj.email,
              displayName: userObj.displayName,
              role: 'supervisor',
              createdAt: Date.now(),
              permissions: {
                canApproveShops: true,
                canModerateJobs: true,
                canModerateReviews: true,
                canManageBanners: true
              }
            }, { merge: true });
          }
        }
      }
      showToast(`تم تعديل رتب الحسابات المحددة إلى (${getRoleLabel(newRole)}) بنجاح`, 'success');
      setSelectedUids([]);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تعديل رتب الحسابات جماعياً', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUids.length === 0) return;
    if (!window.confirm(`تحذير هام جداً: هل أنت متأكد من حذف الحسابات المحددة (${selectedUids.length} حساب) نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء!`)) return;

    try {
      setLoading(true);
      for (const uid of selectedUids) {
        if (uid === currentUser?.uid) continue;
        await deleteDoc(doc(db, 'users', uid));
      }
      showToast(`تم حذف الحسابات المحددة (${selectedUids.length} حساب) نهائياً بنجاح`, 'info');
      setSelectedUids([]);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء الحذف الجماعي للحسابات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const ADMIN_BOOTSTRAP_EMAILS = [
    'princessofx2344@gmail.com',
    'admin@shoofiirbid.com',
    'irbid.admin@gmail.com',
    'tharawt74@gmail.com'
  ];

  // Fetch all user accounts & businesses from Firestore
  const fetchUsers = async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Also fetch businesses to ensure fresh link mapping
      try {
        const bizSnap = await getDocs(collection(db, 'businesses'));
        const fetchedBiz: Business[] = [];
        bizSnap.forEach(d => {
          fetchedBiz.push({ id: d.id, ...d.data() } as Business);
        });
        if (fetchedBiz.length > 0) {
          setAllBusinesses(fetchedBiz);
        }
      } catch (bErr) {
        console.warn('Could not refresh businesses in AccountsManager:', bErr);
      }

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

  // Helper to find all shops and medical facilities owned by or registered under a user account
  const getUserBusinesses = (user: UserProfile) => {
    if (!user || !allBusinesses.length) return [];
    const userUid = user.uid;
    const userEmail = (user.email || '').toLowerCase().trim();
    const userPhone = (user.phone || '').replace(/\D/g, '');
    const merchantIds = user.merchantBusinessIds || [];

    return allBusinesses.filter(b => {
      // 1. Direct UID match
      if (b.userId && b.userId === userUid) return true;
      if (b.ownerId && b.ownerId === userUid) return true;

      // 2. merchantBusinessIds array on user profile
      if (merchantIds.includes(b.id)) return true;

      // 3. Email match
      if (userEmail && userEmail !== 'بدون بريد') {
        if (b.ownerEmail && b.ownerEmail.toLowerCase().trim() === userEmail) return true;
        if (b.ownerContact && b.ownerContact.toLowerCase().trim() === userEmail) return true;
        if (Array.isArray((b as any).staffEmails) && (b as any).staffEmails.map((e: string) => e.toLowerCase().trim()).includes(userEmail)) return true;
      }

      // 4. Phone match (if valid phone)
      if (userPhone && userPhone.length >= 7) {
        if (b.ownerPhone && b.ownerPhone.replace(/\D/g, '') === userPhone) return true;
      }

      return false;
    });
  };

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
  const handleDeleteUser = async () => {
    if (!db || !isAdmin || !selectedUserForDelete) return;
    setSubmitting(true);
    try {
      await deleteDoc(doc(db, 'users', selectedUserForDelete.uid));
      setUsers(prev => prev.filter(u => u.uid !== selectedUserForDelete.uid));
      showToast(`تم حذف الحساب (${selectedUserForDelete.displayName}) نهائياً.`);
      setSelectedUserForDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast('حدث خطأ أثناء حذف الحساب', 'error');
    } finally {
      setSubmitting(false);
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

      {/* Bulk actions for selected users */}
      {selectedUids.length > 0 && (
        <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#1a4d2e]">تم تحديد {selectedUids.length} حسابات لإجراء عملية جماعية:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkChangeStatus('active')}
              className="bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Unlock className="h-3.5 w-3.5 text-emerald-600" />
              تنشيط الحسابات
            </button>
            <button
              onClick={() => handleBulkChangeStatus('suspended')}
              className="bg-white text-rose-800 hover:bg-rose-100 border border-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 text-rose-600" />
              إيقاف الحسابات
            </button>
            <button
              onClick={() => {
                const roleInput = window.prompt("اختر الرتبة الجديدة (user, merchant, supervisor):", "merchant");
                if (roleInput && ['user', 'merchant', 'supervisor'].includes(roleInput)) {
                  handleBulkChangeRole(roleInput as any);
                } else if (roleInput) {
                  alert("الرتبة غير صالحة. يرجى إدخال: user, merchant, supervisor");
                }
              }}
              className="bg-white text-amber-800 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5 text-amber-600" />
              تعديل الرتبة جماعياً
            </button>
            {isAdmin && (
              <button
                onClick={handleBulkDeleteUsers}
                className="bg-[#1a4d2e] hover:bg-[#133b22] text-white px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-colors cursor-pointer shadow-3xs"
              >
                <Trash2 className="h-3.5 w-3.5 text-[#ff9f1c]" />
                حذف الحسابات نهائياً
              </button>
            )}
            <button
              onClick={() => setSelectedUids([])}
              className="text-stone-500 hover:text-stone-700 text-xs font-bold px-2 py-1 cursor-pointer"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

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
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUids.includes(u.uid))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUids(filteredUsers.map(u => u.uid));
                        } else {
                          setSelectedUids([]);
                        }
                      }}
                      className="h-4.5 w-4.5 rounded text-[#1a4d2e] focus:ring-[#1a4d2e] border-stone-300 cursor-pointer"
                    />
                  </th>
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
                  const isSelected = selectedUids.includes(user.uid);
                  return (
                    <tr key={user.uid} className={`hover:bg-stone-50/80 transition-colors ${
                      isSelected ? 'bg-emerald-50/10' : isSuspended ? 'bg-rose-50/30' : ''
                    }`}>
                      {/* Select Checkbox */}
                      <td className="py-3.5 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={user.uid === currentUser?.uid}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUids(prev => [...prev, user.uid]);
                            } else {
                              setSelectedUids(prev => prev.filter(uid => uid !== user.uid));
                            }
                          }}
                          className="h-4.5 w-4.5 rounded text-[#1a4d2e] focus:ring-[#1a4d2e] border-stone-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Name & Email & Linked Businesses */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const userBiz = getUserBusinesses(user);
                          return (
                            <div className="flex items-center gap-3">
                              <div 
                                onClick={() => setSelectedUserForDetails(user)}
                                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 cursor-pointer transition-transform hover:scale-105 shadow-2xs ${
                                  user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                                  user.role === 'supervisor' ? 'bg-emerald-100 text-emerald-800' :
                                  user.role === 'merchant' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'
                                }`}
                                title="انقر لعرض تفاصيل الحساب والمحلات/المنشآت التابعة له"
                              >
                                {user.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-black text-stone-900 flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedUserForDetails(user)}
                                    className="hover:text-[#1a4d2e] transition-colors text-right font-black cursor-pointer underline decoration-dotted underline-offset-2"
                                    title="انقر لعرض المحلات والمنشآت المسجلة باسم هذا الحساب"
                                  >
                                    {user.displayName}
                                  </button>
                                  {user.uid === currentUser?.uid && (
                                    <span className="bg-sky-100 text-sky-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">أنت</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-stone-400 font-mono">{user.email}</div>
                                
                                {/* Badge of registered businesses */}
                                <div className="pt-0.5">
                                  {userBiz.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedUserForDetails(user)}
                                      className="bg-emerald-50 hover:bg-emerald-100 text-[#1a4d2e] border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                      title="اضغط لعرض كافة المحلات والمنشآت"
                                    >
                                      <Store className="h-3 w-3 text-emerald-600" />
                                      <span>{userBiz.length} محلات / منشآت مسجلة</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-stone-400 font-normal">لا توجد محلات مسجلة</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
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
                              onClick={() => setSelectedUserForDelete(user)}
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
        <div className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
              <h3 className="font-black text-lg text-stone-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#1a4d2e]" />
                <span>إضافة وتوثيق حساب جديد</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4 text-xs overflow-y-auto flex-1 my-3 pr-1">
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

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2 shrink-0">
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
        <div className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
              <div>
                <h3 className="font-black text-base text-stone-900">تعديل رتبة وصلاحيات الحساب</h3>
                <p className="text-xs text-stone-500">{selectedUserForEdit.displayName} ({selectedUserForEdit.email})</p>
              </div>
              <button onClick={() => setSelectedUserForEdit(null)} className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto flex-1 my-3 pr-1">
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

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2 shrink-0">
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
        <div className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                {selectedUserForStatus.status === 'suspended' ? (
                  <Unlock className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Lock className="h-5 w-5 text-rose-600" />
                )}
                <span>{selectedUserForStatus.status === 'suspended' ? 'إعادة تنشيط الحساب' : 'إيقاف وتجميد الحساب'}</span>
              </h3>
              <button onClick={() => setSelectedUserForStatus(null)} className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 my-3 overflow-y-auto flex-1 pr-1 text-xs">
              <p className="text-stone-600 leading-relaxed">
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
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2 shrink-0">
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
        <div className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <Send className="h-5 w-5 text-purple-600" />
                <span>إرسال إشعار خاص ومباشر</span>
              </h3>
              <button onClick={() => setSelectedUserForMessage(null)} className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-stone-500 pt-2 shrink-0">
              سيصل هذا الإشعار المباشر فوراً إلى حساب: <span className="font-bold text-stone-900">{selectedUserForMessage.displayName}</span>
            </div>

            <form onSubmit={handleSendDirectMessage} className="space-y-3 text-xs overflow-y-auto flex-1 my-3 pr-1">
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

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2 shrink-0">
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

      {/* MODAL 5: View Full Details & Registered Businesses Modal */}
      {selectedUserForDetails && (() => {
        const userBizList = getUserBusinesses(selectedUserForDetails);
        return (
          <div className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1a4d2e] text-white flex items-center justify-center font-black text-base shadow-xs">
                    {selectedUserForDetails.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-stone-900 flex items-center gap-2 flex-wrap">
                      <span>{selectedUserForDetails.displayName}</span>
                      {getRoleBadge(selectedUserForDetails.role)}
                    </h3>
                    <p className="text-xs text-stone-500 font-mono mt-0.5">{selectedUserForDetails.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserForDetails(null)} 
                  className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto flex-1 space-y-5 my-3 pr-1 text-xs">
                {/* User Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                    <span className="text-stone-400 font-bold block">رتبة الحساب:</span>
                    <span className="font-black text-stone-800">{getRoleLabel(selectedUserForDetails.role)}</span>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                    <span className="text-stone-400 font-bold block">حالة الحساب:</span>
                    <span className="font-bold text-stone-800">{selectedUserForDetails.status === 'suspended' ? '❌ موقوف' : '✅ نشط'}</span>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                    <span className="text-stone-400 font-bold block">رقم الهاتف:</span>
                    <span className="font-bold font-mono text-stone-800">{selectedUserForDetails.phone || 'غير مسجل'}</span>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1 sm:col-span-2">
                    <span className="text-stone-400 font-bold block">المعرف UID:</span>
                    <span className="font-mono text-[11px] text-stone-700 select-all font-bold">{selectedUserForDetails.uid}</span>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                    <span className="text-stone-400 font-bold block">تاريخ التسجيل:</span>
                    <span className="font-bold text-stone-800">{selectedUserForDetails.createdAt ? new Date(selectedUserForDetails.createdAt).toLocaleDateString('ar-JO') : 'غير محدد'}</span>
                  </div>
                </div>

                {selectedUserForDetails.statusReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                    <span className="font-bold text-rose-900 block">سبب الإيقاف المسجل:</span>
                    <p className="text-rose-800">{selectedUserForDetails.statusReason}</p>
                  </div>
                )}

                {/* REGISTERED BUSINESSES & FACILITIES SECTION */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                    <h4 className="font-black text-stone-900 text-sm flex items-center gap-2">
                      <Store className="h-4.5 w-4.5 text-[#1a4d2e]" />
                      <span>المحلات والمنشآت المسجلة باسم هذا الحساب</span>
                      <span className="bg-[#1a4d2e] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {userBizList.length}
                      </span>
                    </h4>
                  </div>

                  {userBizList.length === 0 ? (
                    <div className="bg-stone-50 border border-dashed border-stone-300 rounded-2xl p-6 text-center space-y-2">
                      <Store className="h-8 w-8 text-stone-300 mx-auto" />
                      <p className="font-bold text-stone-600 text-xs">لا توجد محلات تجارية أو منشآت طبية مسجلة باسم هذا الحساب حتى الآن</p>
                      <p className="text-[11px] text-stone-400">عندما يقوم هذا المستخدم بإنشاء محل أو منشأة طبية أو توثيق ملكية محل، ستظهر قائمة منشآته التفصيلية هنا فوراً.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {userBizList.map(biz => {
                        const isMedical = biz.category === 'medical' || biz.category === 'طبي' || (biz as any).isMedicalFacility;
                        const publicUrl = biz.username ? `/b/${biz.username}` : `/business/${biz.id}`;

                        return (
                          <div 
                            key={biz.id}
                            className="bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {/* Thumbnail */}
                              <div className="w-12 h-12 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-stone-400 shadow-2xs">
                                {biz.logoUrl || biz.imageUrl ? (
                                  <img src={biz.logoUrl || biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
                                ) : isMedical ? (
                                  <Stethoscope className="h-6 w-6 text-sky-600" />
                                ) : (
                                  <Store className="h-6 w-6 text-[#1a4d2e]" />
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="font-black text-stone-900 text-xs flex items-center gap-2 flex-wrap">
                                  <span>{biz.name}</span>
                                  {isMedical ? (
                                    <span className="bg-sky-100 text-sky-900 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      🩺 منشأة طبية
                                    </span>
                                  ) : (
                                    <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      🏪 {biz.category || 'محل تجاري'}
                                    </span>
                                  )}

                                  {/* Status badge */}
                                  {biz.status === 'pending' ? (
                                    <span className="bg-yellow-100 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      ⏳ قيد المراجعة
                                    </span>
                                  ) : biz.status === 'hidden' || biz.isHidden ? (
                                    <span className="bg-stone-200 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      🙈 مخفي
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      ✅ نشط ومفعل
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-stone-500 flex items-center gap-3 flex-wrap font-medium">
                                  {biz.district && <span>📍 {biz.district}</span>}
                                  {biz.address && !biz.district && <span>📍 {biz.address}</span>}
                                  {biz.phone && <span dir="ltr">📞 {biz.phone}</span>}
                                  {biz.rating > 0 && <span>⭐ {biz.rating} ({biz.reviewCount || 0})</span>}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors shadow-3xs"
                              >
                                <Eye className="h-3.5 w-3.5 text-[#1a4d2e]" />
                                <span>معاينة البطاقة</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-stone-100 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedUserForDetails(null)}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 6: Custom Delete Confirmation Modal */}
      {selectedUserForDelete && (
        <div className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden text-right">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
              <h3 className="font-black text-base text-rose-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                <span>حذف الحساب نهائياً</span>
              </h3>
              <button onClick={() => setSelectedUserForDelete(null)} className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 my-3 overflow-y-auto flex-1 pr-1">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-950 text-xs leading-relaxed space-y-1">
                <p className="font-bold">⚠️ تحذير أمني هام:</p>
                <p>
                  أنت على وشك القيام بحذف حساب المستخدم <span className="font-black">({selectedUserForDelete.displayName})</span> وبريده <span className="font-mono font-bold">({selectedUserForDelete.email})</span> بشكل نهائي من قاعدة البيانات.
                </p>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                هذا الإجراء سيقوم بإزالة سجل الحساب بالكامل ولا يمكن التراجع عنه بأي شكل من الأشكال. هل تريد الاستمرار في الحذف؟
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedUserForDelete(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer text-xs"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-xs cursor-pointer disabled:opacity-50 text-xs flex items-center gap-1.5"
              >
                {submitting ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
