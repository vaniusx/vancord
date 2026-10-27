import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const THEME_STORAGE_KEY = "vancord.theme";

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system",
      setMode: (mode) => set({ mode }),
    }),
    { name: THEME_STORAGE_KEY },
  ),
);

function resolveDark(mode: ThemeMode, systemDark: boolean) {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return systemDark;
}

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
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

  useEffect(() => {
    applyTheme(dark);
  }, [dark]);

  return <>{children}</>;
}
