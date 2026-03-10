/**
 * tab-store.ts — 多标签页 Tab Manager（T14，AC12）
 *
 * 设计：
 * - 每个 Tab 持有独立的 DocumentState 快照
 * - 切换 Tab 时，把当前 store 状态存入快照，从目标 Tab 恢复
 * - 支持：新建/打开/关闭/切换 Tab，Notepad++ 风格
 *
 * AC12：同时开 3 个文件，切换互不干扰
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from "uuid";
import { useDocumentStore } from "./document-store";
import type { DocumentState } from "./document-store";

export interface TabInfo {
  id: string;
  title: string;         // 文件名（未保存时为 "未命名"）
  filePath: string | null;
  isDirty: boolean;
  /** 存储的 DocumentStore 快照（当 tab 不活跃时） */
  snapshot: Pick<DocumentState, "root" | "jsonString" | "undoStack" | "redoStack" | "parseError"> | null;
}

interface TabStoreState {
  tabs: TabInfo[];
  activeTabId: string;

  newTab: () => void;
  openTab: (filePath: string, content: string, title?: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateActiveTabMeta: (patch: Partial<Pick<TabInfo, "title" | "filePath" | "isDirty">>) => void;
}

function makeInitialTab(): TabInfo {
  return {
    id: uuidv4(),
    title: "未命名",
    filePath: null,
    isDirty: false,
    snapshot: null,
  };
}

/** 从 DocumentStore 取快照（不含 actions）*/
function captureSnapshot(): TabInfo["snapshot"] {
  const s = useDocumentStore.getState();
  return {
    root: s.root,
    jsonString: s.jsonString,
    undoStack: s.undoStack,
    redoStack: s.redoStack,
    parseError: s.parseError,
  };
}

/** 把快照恢复到 DocumentStore */
function restoreSnapshot(snapshot: TabInfo["snapshot"]) {
  if (!snapshot) {
    useDocumentStore.getState().loadFromJson("{}", "initial");
    return;
  }
  useDocumentStore.setState({
    root: snapshot.root,
    jsonString: snapshot.jsonString,
    undoStack: snapshot.undoStack,
    redoStack: snapshot.redoStack,
    parseError: snapshot.parseError,
    lastChangeSource: "initial",
  });
}

const initialTab = makeInitialTab();

export const useTabStore = create<TabStoreState>()(
  immer((set, get) => ({
    tabs: [initialTab],
    activeTabId: initialTab.id,

    newTab() {
      set((state) => {
        // 保存当前 tab 快照
        const current = state.tabs.find((t) => t.id === state.activeTabId);
        if (current) current.snapshot = captureSnapshot();

        const tab = makeInitialTab();
        state.tabs.push(tab);
        state.activeTabId = tab.id;
      });
      // 切换到空白文档
      useDocumentStore.getState().loadFromJson("{}", "initial");
    },

    openTab(filePath, content, title) {
      const existingIdx = get().tabs.findIndex((t) => t.filePath === filePath);
      if (existingIdx !== -1) {
        // 文件已打开 → 直接切换
        get().switchTab(get().tabs[existingIdx].id);
        return;
      }

      set((state) => {
        const current = state.tabs.find((t) => t.id === state.activeTabId);
        if (current) current.snapshot = captureSnapshot();

        const tab: TabInfo = {
          id: uuidv4(),
          title: title ?? filePath.split(/[/\\]/).pop() ?? "文件",
          filePath,
          isDirty: false,
          snapshot: null,
        };
        state.tabs.push(tab);
        state.activeTabId = tab.id;
      });
      useDocumentStore.getState().loadFromJson(content, "file");
    },

    closeTab(tabId) {
      const { tabs, activeTabId } = get();
      if (tabs.length <= 1) {
        // 最后一个 tab：清空内容但不关闭
        useDocumentStore.getState().loadFromJson("{}", "initial");
        set((state) => {
          state.tabs[0].title = "未命名";
          state.tabs[0].filePath = null;
          state.tabs[0].isDirty = false;
          state.tabs[0].snapshot = null;
        });
        return;
      }

      const closingIdx = tabs.findIndex((t) => t.id === tabId);
      const isActive = tabId === activeTabId;

      set((state) => {
        state.tabs.splice(closingIdx, 1);
        if (isActive) {
          // 选相邻 tab
          const newIdx = Math.min(closingIdx, state.tabs.length - 1);
          state.activeTabId = state.tabs[newIdx].id;
        }
      });

      if (isActive) {
        const newActive = get().tabs.find((t) => t.id === get().activeTabId);
        restoreSnapshot(newActive?.snapshot ?? null);
      }
    },

    switchTab(tabId) {
      if (tabId === get().activeTabId) return;

      set((state) => {
        // 保存当前
        const current = state.tabs.find((t) => t.id === state.activeTabId);
        if (current) current.snapshot = captureSnapshot();
        state.activeTabId = tabId;
      });

      // 恢复目标 tab
      const target = get().tabs.find((t) => t.id === tabId);
      restoreSnapshot(target?.snapshot ?? null);
    },

    updateActiveTabMeta(patch) {
      set((state) => {
        const tab = state.tabs.find((t) => t.id === state.activeTabId);
        if (tab) Object.assign(tab, patch);
      });
    },
  }))
);

// 选择器
export const selectTabs = (s: TabStoreState) => s.tabs;
export const selectActiveTabId = (s: TabStoreState) => s.activeTabId;
