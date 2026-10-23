import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Sparkles, Check, AlertCircle, Crosshair } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router';

interface MapLocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (lat: number, lng: number) => void;
  isGold: boolean;
  businessName?: string;
  onUpgradeClick?: () => void;
  className?: string;
}

export function MapLocationPicker({
  latitude,
  longitude,
  onChange,
  isGold,
  businessName,
  onUpgradeClick,
  className
}: MapLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(latitude ?? null);
  const [currentLng, setCurrentLng] = useState<number | null>(longitude ?? null);
  const [isLocating, setIsLocating] = useState(false);
  const [locateFeedback, setLocateFeedback] = useState<string | null>(null);

  // Sync external changes
  useEffect(() => {
    if (latitude !== undefined && latitude !== null) {
      setCurrentLat(latitude);
    }
    if (longitude !== undefined && longitude !== null) {
      setCurrentLng(longitude);
    }
  }, [latitude, longitude]);

  // Load Leaflet dynamically
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

  // Initialize interactive Leaflet map when Gold is active
  useEffect(() => {
    if (!isGold || !leafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Default center: Irbid center or existing coordinates
    const centerLat = currentLat || 32.5514;
    const centerLng = currentLng || 35.8514;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: currentLat ? 16 : 14,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Custom Gold Pin icon
      const createGoldIcon = () =>
        L.divIcon({
          className: 'gold-location-marker',
          html: `
            <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border-2 border-white shadow-xl cursor-grab active:cursor-grabbing transform hover:scale-110 transition-transform">
              <span class="text-white text-xs font-black">★</span>
              <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-amber-600 rotate-45 border-r border-b border-white"></div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36]
        });

      // Place or update marker
      if (currentLat && currentLng) {
        const marker = L.marker([currentLat, currentLng], {
          icon: createGoldIcon(),
          draggable: true
        }).addTo(map);

        marker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          const newLat = parseFloat(pos.lat.toFixed(6));
          const newLng = parseFloat(pos.lng.toFixed(6));
          setCurrentLat(newLat);
          setCurrentLng(newLng);
          onChange(newLat, newLng);
        });

        markerRef.current = marker;
      }

      // Map Click event: place or move pin
      map.on('click', (e: any) => {
        const newLat = parseFloat(e.latlng.lat.toFixed(6));
        const newLng = parseFloat(e.latlng.lng.toFixed(6));
        setCurrentLat(newLat);
        setCurrentLng(newLng);
        onChange(newLat, newLng);

        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        } else {
          const marker = L.marker([newLat, newLng], {
            icon: createGoldIcon(),
            draggable: true
          }).addTo(map);

          marker.on('dragend', (ev: any) => {
            const pos = ev.target.getLatLng();
            const dragLat = parseFloat(pos.lat.toFixed(6));
            const dragLng = parseFloat(pos.lng.toFixed(6));
            setCurrentLat(dragLat);
            setCurrentLng(dragLng);
            onChange(dragLat, dragLng);
          });

          markerRef.current = marker;
        }
      });

      mapInstanceRef.current = map;
    } else {
      // Map instance already exists, update marker if needed
      if (currentLat && currentLng) {
        if (markerRef.current) {
          markerRef.current.setLatLng([currentLat, currentLng]);
        }
      }
    }

    return () => {
      // Cleanup on unmount
    };
  }, [isGold, leafletLoaded]);

  // Handler to locate user via browser GPS
  const handleUseCurrentLocation = () => {
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
        onChange(lat, lng);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 17);
          const L = (window as any).L;
          if (L) {
            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
            } else {
              const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                  className: 'gold-location-marker',
                  html: `
                    <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border-2 border-white shadow-xl cursor-grab">
                      <span class="text-white text-xs font-black">★</span>
                      <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-amber-600 rotate-45 border-r border-b border-white"></div>
                    </div>
                  `,
                  iconSize: [36, 36],
                  iconAnchor: [18, 36]
                }),
                draggable: true
              }).addTo(mapInstanceRef.current);
              markerRef.current = marker;
            }
          }
        }
        setLocateFeedback('تم تحديد موقعك بدقة');
      },
      (error) => {
        setIsLocating(false);
        setLocateFeedback('تعذر جلب موقعك، يرجى النقر على الخريطة مباشرة');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // If NOT a Gold subscriber: show lock card
  if (!isGold) {
    return (
      <div className={cn("p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-stone-50 border-2 border-amber-300/80 shadow-xs relative overflow-hidden", className)}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <h4 className="text-sm font-black text-amber-950">
                تثبيت الموقع على الخريطة التفاعلية
              </h4>
              <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-2xs">
                حصري للباقة الذهبية
              </span>
            </div>
            <p className="text-xs font-bold text-stone-600 leading-relaxed">
              تثبيت دبوس محلك على خريطة إربد التفاعلية ميزة حصرية لمشتركي الباقة الذهبية لتمكين الزبائن من الوصول إلى موقعك الجغرافي مباشرة وبدقة متناهية.
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {onUpgradeClick ? (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>الترقية للباقة الذهبية</span>
              </button>
            ) : (
              <Link
                to="/pricing"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>الترقية للباقة الذهبية</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Gold subscriber view: Full interactive map picker
  return (
    <div className={cn("space-y-3 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <MapPin className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-stone-900">
                تثبيت مكان المحل على الخريطة التفاعلية
              </h4>
              <span className="text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                ميزة الباقة الذهبية
              </span>
            </div>
            <p className="text-[11px] font-bold text-stone-500">
              انقر على الخريطة لتحديد مكان المحل بدقة، أو اسحب الدبوس لتعديل موقعه
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Crosshair className={cn("h-3.5 w-3.5", isLocating && "animate-spin text-amber-600")} />
          <span>{isLocating ? 'جارٍ التحديد...' : 'تحديد موقعي الحالي'}</span>
        </button>
      </div>

      {locateFeedback && (
        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center gap-2">
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span>{locateFeedback}</span>
        </div>
      )}

      {/* Map Container */}
      <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-stone-200 shadow-inner bg-stone-100">
        {!leafletLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100/90 z-20">
            <div className="flex items-center gap-2 text-stone-600 text-xs font-black">
              <div className="w-4 h-4 border-2 border-stone-400 border-t-amber-500 rounded-full animate-spin"></div>
              <span>جارٍ تحميل الخريطة...</span>
            </div>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full z-10" />
      </div>

      {/* Coordinate status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        {currentLat && currentLng ? (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/80 border border-emerald-200 px-3 py-1.5 rounded-xl font-black">
            <Check className="h-3.5 w-3.5" />
            <span>تم تثبيت الإحداثيات: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-bold text-[11px]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>لم يتم وضع الدبوس بعد، انقر على الخريطة لتثبيت الموقع</span>
          </div>
        )}

        {currentLat && currentLng && (
          <button
            type="button"
            onClick={() => {
              setCurrentLat(null);
              setCurrentLng(null);
              if (markerRef.current && mapInstanceRef.current) {
                mapInstanceRef.current.removeLayer(markerRef.current);
                markerRef.current = null;
              }
            }}
            className="text-stone-400 hover:text-rose-600 font-bold text-[11px] underline cursor-pointer"
          >
            إزالة الدبوس
          </button>
        )}
      </div>
    </div>
  );
}
