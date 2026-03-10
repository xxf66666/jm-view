/** ThemeToggle — 主题切换按钮（T21） */
import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore, ThemeMode } from "../store/theme-store";

const OPTIONS: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
  { value: "light", icon: <Sun size={13} />, label: "浅色" },
  { value: "dark",  icon: <Moon size={13} />, label: "深色" },
  { value: "system", icon: <Monitor size={13} />, label: "跟随系统" },
];

export function ThemeToggle() {
  const { mode, setMode } = useThemeStore();
  const currentIdx = OPTIONS.findIndex((o) => o.value === mode);
  const next = OPTIONS[(currentIdx + 1) % OPTIONS.length];
  const current = OPTIONS[currentIdx];

  return (
    <button
      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"
      onClick={() => setMode(next.value)}
      title={`切换为${next.label}模式`}
    >
      {current.icon}
    </button>
  );
}
