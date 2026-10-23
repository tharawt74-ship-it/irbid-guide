import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Crosshair, Check, AlertCircle, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { Business } from '../../types';
import { cn } from '../../lib/utils';
import { Link } from 'react-router';

interface BusinessMapPinSectionProps {
  business: Business;
  isGold: boolean;
  onSave: (lat: number, lng: number) => Promise<void>;
  onUpgradeClick: () => void;
  isMedical?: boolean;
}

export function BusinessMapPinSection({
  business,
  isGold,
  onSave,
  onUpgradeClick,
  isMedical = false
}: BusinessMapPinSectionProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const initialLat = business.latitude ? parseFloat(business.latitude) : null;
  const initialLng = business.longitude ? parseFloat(business.longitude) : null;

  const [currentLat, setCurrentLat] = useState<number | null>(initialLat);
  const [currentLng, setCurrentLng] = useState<number | null>(initialLng);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [locateFeedback, setLocateFeedback] = useState<string | null>(null);

  // Sync when business changes
  useEffect(() => {
    const lat = business.latitude ? parseFloat(business.latitude) : null;
    const lng = business.longitude ? parseFloat(business.longitude) : null;
    setCurrentLat(lat);
    setCurrentLng(lng);
  }, [business.id, business.latitude, business.longitude]);

  // Dynamically load Leaflet for OSM Map
  useEffect(() => {
    if (!isGold) return;

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
      document.head.appendChild(jsScript);
    } else {
      if ((window as any).L) {
        setLeafletLoaded(true);
      } else {
        jsScript.addEventListener('load', () => setLeafletLoaded(true));
      }
    }
  }, [isGold]);

  // Initialize interactive OpenStreetMap Leaflet Map
  useEffect(() => {
    if (!isGold || !leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const defaultLat = currentLat || 32.5514;
    const defaultLng = currentLng || 35.8514;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: currentLat ? 16 : 14,
        zoomControl: true
      });

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      const createGoldIcon = () =>
        L.divIcon({
          className: 'gold-location-pin',
          html: `
            <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border-2 border-white shadow-xl cursor-grab active:cursor-grabbing transform hover:scale-110 transition-transform">
              <span class="text-white text-xs font-black">★</span>
              <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-amber-600 rotate-45 border-r border-b border-white"></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40]
        });

      if (currentLat && currentLng) {
        const marker = L.marker([currentLat, currentLng], {
          icon: createGoldIcon(),
          draggable: true
        }).addTo(map);

        marker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          setCurrentLat(parseFloat(pos.lat.toFixed(6)));
          setCurrentLng(parseFloat(pos.lng.toFixed(6)));
          setSaveSuccess(false);
        });

        markerRef.current = marker;
      }

      map.on('click', (e: any) => {
        const lat = parseFloat(e.latlng.lat.toFixed(6));
        const lng = parseFloat(e.latlng.lng.toFixed(6));
        setCurrentLat(lat);
        setCurrentLng(lng);
        setSaveSuccess(false);

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], {
            icon: createGoldIcon(),
            draggable: true
          }).addTo(map);

          marker.on('dragend', (ev: any) => {
            const pos = ev.target.getLatLng();
            setCurrentLat(parseFloat(pos.lat.toFixed(6)));
            setCurrentLng(parseFloat(pos.lng.toFixed(6)));
            setSaveSuccess(false);
          });

          markerRef.current = marker;
        }
      });

      mapInstanceRef.current = map;
    } else {
      if (currentLat && currentLng && markerRef.current) {
        markerRef.current.setLatLng([currentLat, currentLng]);
      }
    }

    return () => {
      // Keep map reference stable across re-renders
    };
  }, [isGold, leafletLoaded]);

  // Use Browser GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocateFeedback('خاصية تحديد الموقع غير مدعومة في متصفحك');
      return;
    }

    setIsLocating(true);
    setLocateFeedback(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        setCurrentLat(lat);
        setCurrentLng(lng);
        setSaveSuccess(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 17);
          const L = (window as any).L;
          if (L) {
            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
            } else {
              const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                  className: 'gold-location-pin',
                  html: `
                    <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border-2 border-white shadow-xl cursor-grab">
                      <span class="text-white text-xs font-black">★</span>
                      <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-amber-600 rotate-45 border-r border-b border-white"></div>
                    </div>
                  `,
                  iconSize: [40, 40],
                  iconAnchor: [20, 40]
                }),
                draggable: true
              }).addTo(mapInstanceRef.current);
              markerRef.current = marker;
            }
          }
        }
        setLocateFeedback('تم تحديد موقعك بدقة على الخريطة');
      },
      () => {
        setIsLocating(false);
        setLocateFeedback('تعذر تحديد الموقع تلقائياً، يرجى النقر على الخريطة مباشرة');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveLocation = async () => {
    if (!currentLat || !currentLng) return;
    setIsSaving(true);
    try {
      await onSave(currentLat, currentLng);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving map pin:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePin = () => {
    setCurrentLat(null);
    setCurrentLng(null);
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  };

  // 1. LOCKED VIEW FOR NON-GOLD SUBSCRIBERS
  if (!isGold) {
    return (
      <div className="bg-white border border-stone-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 text-right">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-600" />
              <span>{isMedical ? 'تثبيت مكان المنشأة الطبية على الخريطة التفاعلية' : 'تثبيت مكان المحل على الخريطة التفاعلية'}</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              موقع محلك بدقة على خريطة إربد المفتوحة لتمكين الزبائن من التوجه إليك مباشرة
            </p>
          </div>
          <span className="text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full">
            الباقة الذهبية
          </span>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-2 border-amber-300/80 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-md">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-amber-950">
                    ميزة حصرية لمشتركي الباقة الذهبية
                  </h4>
                  <span className="text-[11px] font-bold text-amber-800">
                    ظهور بدبوس ذهبي مميز وموقع جغرافي دقيق
                  </span>
                </div>
              </div>
              <p className="text-xs font-bold text-stone-600 leading-relaxed pt-1">
                تثبيت مكان المنشأة على الخريطة التفاعلية ميزة حصرية لمشتركي الباقة الذهبية. تتيح لك وضع دبوس محلك على خريطة OpenStreetMap بدقة متناهية ليتمكن جميع زوار المنصة من تحديد مكانك والوصول إليك بنقرة واحدة.
              </p>
            </div>

            <button
              type="button"
              onClick={onUpgradeClick}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              <span>الترقية للباقة الذهبية الآن</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE VIEW FOR GOLD SUBSCRIBERS
  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-600" />
              <span>{isMedical ? 'تثبيت مكان المنشأة الطبية على الخريطة التفاعلية' : 'تثبيت مكان المحل على الخريطة التفاعلية'}</span>
            </h3>
            <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-2xs">
              الباقة الذهبية
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            انقر على الخريطة لوضع الدبوس، أو اسحبه لتحديد موقعك الجغرافي بالزبط
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Crosshair className={cn("h-4 w-4 text-amber-600", isLocating && "animate-spin")} />
            <span>{isLocating ? 'جارٍ تحديد موقعك...' : 'تحديد موقعي الحالي'}</span>
          </button>

          <Link
            to="/map"
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-stone-500" />
            <span>معاينة الخريطة</span>
          </Link>
        </div>
      </div>

      {locateFeedback && (
        <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{locateFeedback}</span>
        </div>
      )}

      {/* OpenStreetMap Container */}
      <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-stone-200 shadow-inner bg-stone-100">
        {!leafletLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100/90 z-20">
            <div className="flex items-center gap-2 text-stone-600 text-xs font-black">
              <div className="w-5 h-5 border-2 border-stone-400 border-t-amber-500 rounded-full animate-spin"></div>
              <span>جارٍ تحميل خريطة إربد التفاعلية...</span>
            </div>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full z-10" />
      </div>

      {/* Coordinates & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div>
          {currentLat && currentLng ? (
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold text-xs">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>إحداثيات الموقع المحددة: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-bold text-xs">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>انقر فوق موقعك على الخريطة لوضع الدبوس</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {currentLat && currentLng && (
            <button
              type="button"
              onClick={handleRemovePin}
              className="text-stone-400 hover:text-rose-600 font-bold text-xs underline cursor-pointer px-2"
            >
              إلغاء التحديد
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveLocation}
            disabled={!currentLat || !currentLng || isSaving}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer",
              saveSuccess
                ? "bg-emerald-600 text-white"
                : "bg-[#1a4d2e] hover:bg-[#133b22] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>جارٍ الحفظ...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-4 w-4 text-white" />
                <span>تم تثبيت الموقع بنجاح</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-amber-300" />
                <span>حفظ وتثبيت الموقع على الخريطة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
