import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "system" | "light" | "dark";

export const THEME_OPTIONS = [
  { id: "petrol", labelKey: "themes.petrol", swatch: "#1F5F52", tint: "#EDF1EE" },
  { id: "graphite", labelKey: "themes.graphite", swatch: "#2F4A6D", tint: "#EAEEF4" },
  { id: "olive", labelKey: "themes.olive", swatch: "#4B5B3F", tint: "#EEF0E6" },
  { id: "ember", labelKey: "themes.ember", swatch: "#A15430", tint: "#F6ECE5" },
  { id: "rose", labelKey: "themes.rose", swatch: "#8C4362", tint: "#F7EBF0" },
  { id: "mint", labelKey: "themes.mint", swatch: "#17605C", tint: "#E9F2EF" },
] as const;

export type ThemeId = (typeof THEME_OPTIONS)[number]["id"];
export const DEFAULT_THEME: ThemeId = "petrol";

interface ThemeState {
  mode: ThemeMode;
  themeId: ThemeId;
  setMode: (mode: ThemeMode) => void;
  setThemeId: (themeId: ThemeId) => void;
}

export const THEME_STORAGE_KEY = "vancord.theme";

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system",
      themeId: DEFAULT_THEME,
      setMode: (mode) => set({ mode }),
      setThemeId: (themeId) => set({ themeId }),
    }),
    { name: THEME_STORAGE_KEY },
  ),
);

function resolveDark(mode: ThemeMode, systemDark: boolean) {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return systemDark;
}

function applyTheme(dark: boolean, themeId: ThemeId) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  if (themeId === DEFAULT_THEME) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", themeId);
}

export function useSystemDark() {
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return systemDark;
}

export function useIsDark() {
  const mode = useThemeStore((state) => state.mode);
  const systemDark = useSystemDark();
  return resolveDark(mode, systemDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dark = useIsDark();
  const themeId = useThemeStore((state) => state.themeId);

  useEffect(() => {
    applyTheme(dark, themeId);
  }, [dark, themeId]);

  return <>{children}</>;
}
