import { WorkingHours } from '../types';

export interface LiveStatus {
  isOpen: boolean;
  isClosingSoon: boolean;
  statusText: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  hoursDisplay: string;
  nextChangeText?: string;
}

export function formatTimeToArabic(timeStr?: string): string {
  if (!timeStr) return '';
  const [hoursStr, minutesStr] = timeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr ? minutesStr.padStart(2, '0') : '00';
  
  if (isNaN(hours)) return timeStr;
  
  const period = hours >= 12 ? 'م' : 'ص';
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  
  return `${hours}:${minutes} ${period}`;
}

export function getLiveWorkingStatus(workingHours?: WorkingHours): LiveStatus {
  // Default if no hours configured
  if (!workingHours || (!workingHours.isOpen24Hours && !workingHours.openTime && !workingHours.closeTime)) {
    return {
      isOpen: true,
      isClosingSoon: false,
      statusText: 'مفتوح للزوار',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      badgeText: 'text-emerald-700',
      dotColor: 'bg-emerald-500',
      hoursDisplay: 'متاح يومياً للزوار'
    };
  }

  // If manually closed for maintenance / holiday
  if (workingHours.isCustomClosed) {
    return {
      isOpen: false,
      isClosingSoon: false,
      statusText: 'مغلق مؤقتاً',
      badgeBg: 'bg-red-50 border-red-200 text-red-800',
      badgeText: 'text-red-700',
      dotColor: 'bg-red-500',
      hoursDisplay: 'مغلق مؤقتاً',
      nextChangeText: 'يرجى مراجعة صفحة المحل'
    };
  }

  // If open 24 hours
  if (workingHours.isOpen24Hours) {
    return {
      isOpen: true,
      isClosingSoon: false,
      statusText: 'مفتوح 24 ساعة',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      badgeText: 'text-emerald-700',
      dotColor: 'bg-emerald-500 animate-pulse',
      hoursDisplay: 'مفتوح على مدار 24 ساعة'
    };
  }

  const openTimeStr = workingHours.openTime || '09:00';
  const closeTimeStr = workingHours.closeTime || '23:00';

  const [openH, openM] = openTimeStr.split(':').map(Number);
  const [closeH, closeM] = closeTimeStr.split(':').map(Number);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const openMinutes = (openH || 0) * 60 + (openM || 0);
  let closeMinutes = (closeH || 0) * 60 + (closeM || 0);

  // If close time is past midnight (e.g. opens 10:00 AM, closes 02:00 AM next day)
  let isOpen = false;
  let isClosingSoon = false;
  let minutesUntilClose = 0;

  if (closeMinutes < openMinutes) {
    // Overnight schedule
    if (currentMinutes >= openMinutes || currentMinutes < closeMinutes) {
      isOpen = true;
      if (currentMinutes >= openMinutes) {
        minutesUntilClose = (24 * 60 - currentMinutes) + closeMinutes;
      } else {
        minutesUntilClose = closeMinutes - currentMinutes;
      }
    }
  } else {
    // Normal same-day schedule
    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      isOpen = true;
      minutesUntilClose = closeMinutes - currentMinutes;
    }
  }

  if (isOpen && minutesUntilClose > 0 && minutesUntilClose <= 45) {
    isClosingSoon = true;
  }

  const formattedOpen = formatTimeToArabic(openTimeStr);
  const formattedClose = formatTimeToArabic(closeTimeStr);
  const daysText = workingHours.days || 'يومياً';
  const hoursDisplay = `${daysText} (${formattedOpen} - ${formattedClose})`;

  if (isClosingSoon) {
    return {
      isOpen: true,
      isClosingSoon: true,
      statusText: 'يغلق قريباً',
      badgeBg: 'bg-amber-50 border-amber-300 text-amber-900',
      badgeText: 'text-amber-800',
      dotColor: 'bg-amber-500 animate-ping',
      hoursDisplay,
      nextChangeText: `يغلق في غضون ${minutesUntilClose} دقيقة (الساعة ${formattedClose})`
    };
  }

  if (isOpen) {
    return {
      isOpen: true,
      isClosingSoon: false,
      statusText: 'مفتوح الآن',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      badgeText: 'text-emerald-700',
      dotColor: 'bg-emerald-500 animate-pulse',
      hoursDisplay,
      nextChangeText: `يغلق الساعة ${formattedClose}`
    };
  }

  return {
    isOpen: false,
    isClosingSoon: false,
    statusText: 'مغلق الآن',
    badgeBg: 'bg-rose-50 border-rose-200 text-rose-800',
    badgeText: 'text-rose-700',
    dotColor: 'bg-rose-500',
    hoursDisplay,
    nextChangeText: `يفتح الساعة ${formattedOpen}`
  };
}
