/**
 * Centralized Jordan Date & Time Utilities (Asia/Amman, UTC+3)
 * Guarantees that all dates, times, business status calculations, prayer times,
 * analytics charts, and subscription management operate strictly under official Jordan Time,
 * completely independent of the client's browser or device clock/timezone settings.
 */

/**
 * Retrieves a JS Date object whose components (getFullYear, getMonth, getDate, getHours, getMinutes, getSeconds, getDay)
 * accurately reflect Jordan local time (Asia/Amman).
 */
export function getJordanNow(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Amman',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(now);

  const getPart = (type: string): number => {
    const p = parts.find(p => p.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };

  const year = getPart('year');
  const month = getPart('month') - 1; // 0-indexed month
  const day = getPart('day');
  let hour = getPart('hour');
  if (hour === 24) hour = 0;
  const minute = getPart('minute');
  const second = getPart('second');

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Converts any date or timestamp into a Date object normalized to Jordan local time (Asia/Amman).
 */
export function toJordanDate(dateInput?: Date | number | string | null): Date {
  if (!dateInput) return getJordanNow();
  const rawDate = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(rawDate.getTime())) return getJordanNow();

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Amman',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(rawDate);

  const getPart = (type: string): number => {
    const p = parts.find(p => p.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };

  const year = getPart('year');
  const month = getPart('month') - 1;
  const day = getPart('day');
  let hour = getPart('hour');
  if (hour === 24) hour = 0;
  const minute = getPart('minute');
  const second = getPart('second');

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Returns date formatted as ISO string date 'YYYY-MM-DD' in Jordan timezone.
 */
export function getJordanDateISO(dateInput?: Date | number | string | null): string {
  const d = toJordanDate(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday) in Jordan timezone.
 */
export function getJordanDayOfWeek(dateInput?: Date | number | string | null): number {
  const d = toJordanDate(dateInput);
  return d.getDay();
}

/**
 * Formats a date using Arabic (ar-JO) locale and Jordan Timezone.
 */
export function formatJordanDateArabic(
  dateInput?: Date | number | string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = dateInput ? (typeof dateInput === 'object' ? dateInput : new Date(dateInput)) : new Date();
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ar-JO', {
    timeZone: 'Asia/Amman',
    ...options
  }).format(d);
}

/**
 * Formats time in 12-hour Arabic style ("02:30 م" or "09:15 ص") in Jordan timezone.
 */
export function formatJordanTime12h(dateInput?: Date | number | string | null): string {
  const d = toJordanDate(dateInput);
  const hours24 = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours24 >= 12 ? 'م' : 'ص';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${String(hours12).padStart(2, '0')}:${minutes} ${period}`;
}

/**
 * Calculates start of day timestamp (00:00:00.000) for Jordan local date.
 */
export function getJordanStartOfDay(dateInput?: Date | number | string | null): number {
  const d = toJordanDate(dateInput);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}

/**
 * Returns current Jordan year.
 */
export function getJordanYear(): number {
  return getJordanNow().getFullYear();
}
