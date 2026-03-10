/**
 * shortcut-store.ts — 快捷键系统（T20，F17）
 *
 * 预设方案：Word / Notepad++ / VS Code / 默认
 * 自定义：用户可覆盖任意快捷键
 */

import { create } from "zustand";

export type ShortcutAction =
  | "undo" | "redo" | "save" | "saveAs" | "open" | "new"
  | "search" | "replace" | "copy" | "cut" | "paste";

export type ShortcutPreset = "default" | "word" | "notepad++" | "vscode";

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  label: string;
}

type ShortcutMap = Record<ShortcutAction, Shortcut>;

const PRESETS: Record<ShortcutPreset, ShortcutMap> = {
  default: {
    undo:    { key: "z", ctrl: true, label: "Ctrl+Z" },
    redo:    { key: "y", ctrl: true, label: "Ctrl+Y" },
    save:    { key: "s", ctrl: true, label: "Ctrl+S" },
    saveAs:  { key: "s", ctrl: true, shift: true, label: "Ctrl+Shift+S" },
    open:    { key: "o", ctrl: true, label: "Ctrl+O" },
    new:     { key: "n", ctrl: true, label: "Ctrl+N" },
    search:  { key: "f", ctrl: true, label: "Ctrl+F" },
    replace: { key: "h", ctrl: true, label: "Ctrl+H" },
    copy:    { key: "c", ctrl: true, label: "Ctrl+C" },
    cut:     { key: "x", ctrl: true, label: "Ctrl+X" },
    paste:   { key: "v", ctrl: true, label: "Ctrl+V" },
  },
  word: {
    undo:    { key: "z", ctrl: true, label: "Ctrl+Z" },
    redo:    { key: "y", ctrl: true, label: "Ctrl+Y" },
    save:    { key: "s", ctrl: true, label: "Ctrl+S" },
    saveAs:  { key: "s", ctrl: true, shift: true, label: "Ctrl+Shift+S" },
    open:    { key: "o", ctrl: true, label: "Ctrl+O" },
    new:     { key: "n", ctrl: true, label: "Ctrl+N" },
    search:  { key: "f", ctrl: true, label: "Ctrl+F" },
    replace: { key: "h", ctrl: true, label: "Ctrl+H" },
    copy:    { key: "c", ctrl: true, label: "Ctrl+C" },
    cut:     { key: "x", ctrl: true, label: "Ctrl+X" },
    paste:   { key: "v", ctrl: true, label: "Ctrl+V" },
  },
  "notepad++": {
    undo:    { key: "z", ctrl: true, label: "Ctrl+Z" },
    redo:    { key: "y", ctrl: true, label: "Ctrl+Y" },
    save:    { key: "s", ctrl: true, label: "Ctrl+S" },
    saveAs:  { key: "s", ctrl: true, alt: true, label: "Ctrl+Alt+S" },
    open:    { key: "o", ctrl: true, label: "Ctrl+O" },
    new:     { key: "n", ctrl: true, label: "Ctrl+N" },
    search:  { key: "f", ctrl: true, label: "Ctrl+F" },
    replace: { key: "h", ctrl: true, label: "Ctrl+H" },
    copy:    { key: "c", ctrl: true, label: "Ctrl+C" },
    cut:     { key: "x", ctrl: true, label: "Ctrl+X" },
    paste:   { key: "v", ctrl: true, label: "Ctrl+V" },
  },
  vscode: {
    undo:    { key: "z", ctrl: true, label: "Ctrl+Z" },
    redo:    { key: "z", ctrl: true, shift: true, label: "Ctrl+Shift+Z" },
    save:    { key: "s", ctrl: true, label: "Ctrl+S" },
    saveAs:  { key: "s", ctrl: true, shift: true, label: "Ctrl+Shift+S" },
    open:    { key: "o", ctrl: true, label: "Ctrl+O" },
    new:     { key: "n", ctrl: true, label: "Ctrl+N" },
    search:  { key: "f", ctrl: true, label: "Ctrl+F" },
    replace: { key: "h", ctrl: true, label: "Ctrl+H" },
    copy:    { key: "c", ctrl: true, label: "Ctrl+C" },
    cut:     { key: "x", ctrl: true, label: "Ctrl+X" },
    paste:   { key: "v", ctrl: true, label: "Ctrl+V" },
  },
};

interface ShortcutState {
  preset: ShortcutPreset;
  customOverrides: Partial<ShortcutMap>;
  /** 当前生效的快捷键映射 */
  shortcuts: ShortcutMap;
  setPreset: (preset: ShortcutPreset) => void;
  setCustom: (action: ShortcutAction, shortcut: Shortcut) => void;
  resetCustom: (action: ShortcutAction) => void;
  /** 检测键盘事件是否匹配某个 action */
  matches: (e: KeyboardEvent, action: ShortcutAction) => boolean;
}

function mergeShortcuts(preset: ShortcutPreset, overrides: Partial<ShortcutMap>): ShortcutMap {
  return { ...PRESETS[preset], ...overrides };
}

export const useShortcutStore = create<ShortcutState>()((set, get) => {
  const savedPreset = (localStorage.getItem("jmview-shortcut-preset") as ShortcutPreset) ?? "default";
  const savedOverrides: Partial<ShortcutMap> = JSON.parse(localStorage.getItem("jmview-shortcut-overrides") ?? "{}");

  return {
    preset: savedPreset,
    customOverrides: savedOverrides,
    shortcuts: mergeShortcuts(savedPreset, savedOverrides),

    setPreset(preset) {
      const shortcuts = mergeShortcuts(preset, get().customOverrides);
      localStorage.setItem("jmview-shortcut-preset", preset);
      set({ preset, shortcuts });
    },

    setCustom(action, shortcut) {
      const overrides = { ...get().customOverrides, [action]: shortcut };
      const shortcuts = mergeShortcuts(get().preset, overrides);
      localStorage.setItem("jmview-shortcut-overrides", JSON.stringify(overrides));
      set({ customOverrides: overrides, shortcuts });
    },

    resetCustom(action) {
      const overrides = { ...get().customOverrides };
      delete overrides[action];
      const shortcuts = mergeShortcuts(get().preset, overrides);
      localStorage.setItem("jmview-shortcut-overrides", JSON.stringify(overrides));
      set({ customOverrides: overrides, shortcuts });
    },

    matches(e, action) {
      const sc = get().shortcuts[action];
      if (!sc) return false;
      return (
        e.key.toLowerCase() === sc.key.toLowerCase() &&
        !!(e.ctrlKey || e.metaKey) === !!sc.ctrl &&
        !!e.shiftKey === !!sc.shift &&
        !!e.altKey === !!sc.alt
      );
    },
  };
});

export { PRESETS };
