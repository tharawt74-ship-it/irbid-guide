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

export default function App() {
  return (
    <ErrorBoundary>
      <SystemSettingsProvider>
        <AuthProvider>
          <NotificationsProvider>
            <CartProvider>
              <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={null}>
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
