/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { Layout } from './components/layout/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Eagerly load critical Home page for immediate initial paint
import { Home } from './pages/Home';

// Lazy load secondary pages to minimize initial bundle size on mobile
const BusinessDetail = lazy(() => import('./pages/BusinessDetail').then(m => ({ default: m.BusinessDetail })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings').then(m => ({ default: m.ProfileSettings })));
const Offers = lazy(() => import('./pages/Offers').then(m => ({ default: m.Offers })));
const Housing = lazy(() => import('./pages/Housing').then(m => ({ default: m.Housing })));
const Tourism = lazy(() => import('./pages/Tourism').then(m => ({ default: m.Tourism })));
const News = lazy(() => import('./pages/News').then(m => ({ default: m.News })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const Jobs = lazy(() => import('./pages/Jobs').then(m => ({ default: m.Jobs })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const Messages = lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));
const PrayerTimes = lazy(() => import('./pages/PrayerTimes').then(m => ({ default: m.PrayerTimes })));
const Transportation = lazy(() => import('./pages/Transportation').then(m => ({ default: m.Transportation })));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="w-12 h-12 rounded-2xl bg-[#1a4d2e]/10 flex items-center justify-center text-[#1a4d2e] mb-3 animate-bounce">
        <Loader2 className="h-6 w-6 animate-spin text-[#1a4d2e]" />
      </div>
      <p className="text-sm font-black text-stone-700">جاري تحميل المحتوى...</p>
      <p className="text-xs text-stone-400 mt-1">شو في بإربد؟</p>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationsProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="admin" element={<AdminDashboard />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="profile/settings" element={<ProfileSettings />} />
                  <Route path="settings" element={<ProfileSettings />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="business/:id" element={<BusinessDetail />} />
                  <Route path="b/:id" element={<BusinessDetail />} />
                  <Route path="@:id" element={<BusinessDetail />} />
                  <Route path="news" element={<News />} />
                  <Route path="jobs" element={<Jobs />} />
                  <Route path="offers" element={<Offers />} />
                  <Route path="housing" element={<Housing />} />
                  <Route path="tourism" element={<Tourism />} />
                  <Route path="transportation" element={<Transportation />} />
                  <Route path="prayer-times" element={<PrayerTimes />} />
                  <Route path="packages" element={<Pricing />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </NotificationsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
