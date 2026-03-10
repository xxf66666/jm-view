/**
 * theme-store.ts — 深色/浅色主题（T21，AC11）
 *
 * 三栏同步切换：Tailwind dark class + localStorage 持久化
 * AC11：主题切换后三栏同步应用
 */

import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  /** 实际生效的主题（system 时跟随系统）*/
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return getSystemTheme();
  return mode;
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

const savedMode = (localStorage.getItem("jmview-theme") as ThemeMode | null) ?? "light";
const initialResolved = resolveTheme(savedMode);
applyTheme(initialResolved);

export const useThemeStore = create<ThemeState>()((set) => ({
  mode: savedMode,
  resolved: initialResolved,

  setMode(mode) {
    const resolved = resolveTheme(mode);
    applyTheme(resolved);
    localStorage.setItem("jmview-theme", mode);
    set({ mode, resolved });
  },
}));

// 监听系统主题变化
if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const store = useThemeStore.getState();
    if (store.mode === "system") {
      const resolved = getSystemTheme();
      applyTheme(resolved);
      useThemeStore.setState({ resolved });
    }
  });
}
