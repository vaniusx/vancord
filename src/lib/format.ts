import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
import { enUS, tr } from "date-fns/locale";

const LOCALES = { tr, en: enUS };
let currentLocale: keyof typeof LOCALES = "tr";

export function setDateLocale(locale: string) {
  currentLocale = locale in LOCALES ? (locale as keyof typeof LOCALES) : "tr";
}

function locale() {
  return LOCALES[currentLocale];
}

export function clockTime(value: string | Date) {
  return format(new Date(value), "HH:mm");
}

export function dayLabel(value: string | Date) {
  const date = new Date(value);
  if (isToday(date)) return currentLocale === "tr" ? "Bugün" : "Today";
  if (isYesterday(date)) return currentLocale === "tr" ? "Dün" : "Yesterday";
  return format(date, "d MMMM yyyy", { locale: locale() });
}

export function relativeTime(value: string | Date) {
  return formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
    locale: locale(),
  });
}

export function fullTime(value: string | Date) {
  return format(new Date(value), "d MMMM yyyy HH:mm", { locale: locale() });
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export { accentFor, ACCENT_OPTIONS } from "@/lib/accents";

export function canGroup(previousAt: string, nextAt: string) {
  return new Date(nextAt).getTime() - new Date(previousAt).getTime() < 5 * 60_000;
}
