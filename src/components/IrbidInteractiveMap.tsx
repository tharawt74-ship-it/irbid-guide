import React, { useEffect, useRef, useState } from 'react';
import { Business } from '../types';
import { Store, MapPin, X, ArrowUpRight, Crown } from 'lucide-react';

interface IrbidInteractiveMapProps {
  businesses: Business[];
  onClose?: () => void;
}

export function IrbidInteractiveMap({ businesses, onClose }: IrbidInteractiveMapProps) {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Filter VIP/Premium businesses
  const vipBusinesses = businesses.filter(b => 
    b.isVip === true || 
    b.packageId === 'premium' || 
    b.packageId === 'yearly_gold' ||
    (b.menuItems && b.menuItems.length > 0)
  );

  // Load Leaflet assets dynamically from a CDN to guarantee robust zero-build-error operation
  useEffect(() => {
    let cssLink = document.getElementById('leaflet-css') as HTMLLinkElement;
    if (!cssLink) {
      cssLink = document.createElement('link');
      cssLink.id = 'leaflet-css';
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(cssLink);
    }

    let jsScript = document.getElementById('leaflet-js') as HTMLScriptElement;
    if (!jsScript) {
      jsScript = document.createElement('script');
      jsScript.id = 'leaflet-js';
      jsScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      jsScript.async = true;
      jsScript.onload = () => setLeafletLoaded(true);
      jsScript.onerror = () => setMapError(true);
      document.head.appendChild(jsScript);
    } else {
      // Script already in page, check if window.L is available
      if ((window as any).L) {
        setLeafletLoaded(true);
      } else {
        jsScript.addEventListener('load', () => setLeafletLoaded(true));
      }
    }
  }, []);

  // Initialize map and markers
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    try {
      // Irbid Coordinates
      const irbidCenter = [32.5514, 35.8514];
      
      // Initialize Leaflet map
      const map = L.map(mapContainerRef.current, {
        center: irbidCenter,
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // Add gorgeous free OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;

      // Seed stable mock locations for VIP merchants who do not have custom coordinates
      vipBusinesses.forEach((b, idx) => {
        let lat = b.latitude ? parseFloat(b.latitude) : null;
        let lng = b.longitude ? parseFloat(b.longitude) : null;

        // If no coordinates, offset slightly from center based on the merchant name hash to keep it stable
        if (!lat || !lng) {
          const hash = b.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const latOffset = ((hash % 100) - 50) * 0.00015;
          const lngOffset = (((hash >> 2) % 100) - 50) * 0.00015;
          lat = 32.5514 + latOffset;
          lng = 35.8514 + lngOffset;
        }

        // Create a custom gold pin icon for VIP businesses
        const vipIcon = L.divIcon({
          className: 'custom-vip-marker',
          html: `
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-lg relative transform hover:scale-110 transition-transform">
              <span class="text-xs">👑</span>
              <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-500 rotate-45 border-r border-b border-white"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        const popupContent = `
          <div dir="rtl" class="text-right p-1 max-w-xs space-y-2 font-sans font-black">
            ${b.coverImage || b.image ? `
              <div class="w-full h-24 rounded-lg overflow-hidden bg-stone-100">
                <img src="${b.coverImage || b.image}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
              </div>
            ` : ''}
            <div class="space-y-0.5">
              <div class="flex items-center gap-1">
                <span class="text-xs">👑</span>
                <span class="text-xs text-amber-600 font-extrabold bg-amber-50 px-1.5 py-0.5 rounded">عضو VIP</span>
              </div>
              <h4 class="text-sm font-black text-stone-900">${b.name}</h4>
              <p class="text-[10px] text-stone-500 line-clamp-2">${b.description || 'منشأة مميزة على شو في بإربد'}</p>
            </div>
            <div class="pt-1.5 border-t border-stone-100 flex items-center justify-between gap-2">
              <span class="text-[10px] text-stone-400 font-bold">${b.region || 'مدينة إربد'}</span>
              <a href="/business/${b.id}" class="inline-flex items-center gap-0.5 text-[10px] text-white bg-[#1a4d2e] hover:bg-[#11331e] px-2 py-1 rounded font-black transition-colors">
                <span>تصفح الكتالوج</span>
                <span>➔</span>
              </a>
            </div>
          </div>
        `;

        L.marker([lat, lng], { icon: vipIcon })
          .addTo(map)
          .bindPopup(popupContent);
      });

    } catch (e) {
      console.error('Error initializing Leaflet map:', e);
      setMapError(true);
    }

    return () => {
      // Clean up map instance on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, vipBusinesses]);

  return (
    <div className="bg-white rounded-[32px] border border-[#e5e1da] p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden" dir="rtl">
      <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-2xs">
            <Crown className="h-5 w-5 text-[#2d2a26]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-stone-900">🗺️ خريطة إربد الذكية للمحلات المميزة (VIP)</h3>
            <p className="text-[10px] sm:text-xs text-[#1a4d2e] font-bold mt-0.5">ميزة تصفح حصرية تستعرض فروع المحلات الذهبية والمطاعم ذات الكتالوجات الرقمية في إربد</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {mapError ? (
        <div className="h-96 w-full rounded-2xl bg-red-50 border border-red-100 flex flex-col items-center justify-center p-6 text-center text-red-800 space-y-2">
          <span className="text-xl">⚠️</span>
          <h4 className="text-sm font-black">تعذر تحميل الخريطة التفاعلية</h4>
          <p className="text-xs text-red-600/80 max-w-sm">يرجى التحقق من اتصالك بالإنترنت، أو المحاولة مرة أخرى لاحقاً.</p>
        </div>
      ) : !leafletLoaded ? (
        <div className="h-96 w-full rounded-2xl bg-stone-50 border border-stone-200/50 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-stone-500">جاري تحميل الخرائط التفاعلية لمدينة إربد...</p>
        </div>
      ) : (
        <div className="relative">
          <div 
            ref={mapContainerRef} 
            className="h-96 sm:h-[420px] w-full rounded-2xl border border-stone-200 shadow-inner z-10"
            id="irbid-map"
          />
          
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl text-[10px] font-black text-stone-800 border border-stone-200 shadow-md z-30 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white animate-ping"></span>
            <span>{vipBusinesses.length} منشآت VIP متاحة على الخريطة الآن</span>
          </div>
        </div>
      )}
    </div>
  );
}
