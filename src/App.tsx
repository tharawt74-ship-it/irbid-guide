/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { CartProvider } from './contexts/CartContext';
import { Layout } from './components/layout/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SystemSettingsProvider } from './contexts/SystemSettingsContext';
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
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const AboutUs = lazy(() => import('./pages/AboutUs').then(m => ({ default: m.AboutUs })));
const CartPage = lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })));
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));

function PageLoader() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center select-none relative" dir="rtl">
      <style>{`
        @keyframes fillUpLogoInfinite {
          0% {
            clip-path: inset(100% 0% 0% 0%);
          }
          45% {
            clip-path: inset(0% 0% 0% 0%);
          }
          70% {
            clip-path: inset(0% 0% 0% 0%);
          }
          100% {
            clip-path: inset(0% 0% 100% 0%);
          }
        }
      `}</style>
      
      {/* Soft ambient pulsing background glow */}
      <div className="absolute w-64 h-64 bg-[radial-gradient(circle,rgba(26,77,46,0.03)_0%,rgba(26,77,46,0)_70%)] rounded-full animate-pulse pointer-events-none" />

      {/* Silver to Color Transitioning Logo */}
      <div className="relative w-20 h-20 mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
        {/* Silver Layer (Underneath) */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-stone-100 via-stone-300 to-stone-400 border border-stone-200 flex items-center justify-center text-stone-100 z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <path d="M2 7h20"/>
            <path d="M10 12v3"/>
            <path d="M14 12v3"/>
            <path d="M18 12v3"/>
            <path d="M6 12v3"/>
          </svg>
        </div>

        {/* Colored Brand Layer (revealed via slide-up clip path) */}
        <div 
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-[#133b22] border border-[#1a4d2e]/20 flex items-center justify-center text-[#ff9f1c] z-20 overflow-hidden"
          style={{
            animation: 'fillUpLogoInfinite 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <path d="M2 7h20"/>
            <path d="M10 12v3"/>
            <path d="M14 12v3"/>
            <path d="M18 12v3"/>
            <path d="M6 12v3"/>
          </svg>
        </div>
      </div>

      {/* Silver to Brand Green Transitioning Text */}
      <div className="relative h-9 w-48 flex items-center justify-center">
        <div className="absolute font-black text-xl text-stone-400/80">شو في بإربد؟</div>
        <div 
          className="absolute font-black text-xl bg-gradient-to-r from-[#1a4d2e] to-[#133b22] bg-clip-text text-transparent"
          style={{
            animation: 'fillUpLogoInfinite 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            animationDelay: '0.15s'
          }}
        >
          شو في بإربد؟
        </div>
      </div>

      <p className="text-xs font-bold text-stone-400 mt-2 tracking-wide animate-pulse">جاري تحميل دليل عروس الشمال...</p>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SystemSettingsProvider>
        <AuthProvider>
          <NotificationsProvider>
            <CartProvider>
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
                    <Route path="cart" element={<CartPage />} />
                    <Route path="search" element={<Search />} />
                    <Route path="business/:id" element={<BusinessDetail />} />
                  <Route path="b/:id" element={<BusinessDetail />} />
                  <Route path=":id" element={<BusinessDetail />} />
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
                  <Route path="terms" element={<Terms />} />
                  <Route path="privacy" element={<Privacy />} />
                  <Route path="about" element={<AboutUs />} />
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </CartProvider>
      </NotificationsProvider>
    </AuthProvider>
      </SystemSettingsProvider>
    </ErrorBoundary>
  );
}
