/**
 * outline-panel.test.tsx — T08 单元测试（大纲面板）
 *
 * 覆盖场景：
 * - 渲染第一层 key 列表（不递归）
 * - 点击节点触发 scrollIntoView
 * - 嵌套 container 显示展开图标，点击展开一级子节点
 * - 展开后再点击图标折叠
 * - 空文档显示占位文案
 * - 严格只读：不调用任何写 Store 操作
 */

import React from "react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { OutlinePanel } from "../../src/components/layout/OutlinePanel";
import { useDocumentStore } from "../../src/store/document-store";

// ── 辅助 ──────────────────────────────────────────────────────────────────

function resetStore() {
  useDocumentStore.setState({
    root: { kind: "entries", children: [] },
    jsonString: "{}",
    lastChangeSource: "initial",
    parseError: null,
    undoStack: [],
    redoStack: [],
    _inputBatchTimer: null,
    _batchStartSnapshot: null,
  });
}

function loadJson(json: string) {
  act(() => {
    useDocumentStore.getState().loadFromJson(json, "file");
  });
}

// ── Mock scrollIntoView ───────────────────────────────────────────────────
// jsdom 没有实现 scrollIntoView，需要 mock。
// OutlinePanel 调用 document.getElementById(entry.id)?.scrollIntoView(...)，
// 而测试只渲染 OutlinePanel（没有 EntryCard），getElementById 会返回 null。
// 解决方案：在 beforeEach 里 stub getElementById，返回带 mock scrollIntoView 的假元素。

let mockScrollIntoView: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetStore();
  mockScrollIntoView = vi.fn();

  // stub document.getElementById 使其总返回一个带 scrollIntoView 的假对象
  vi.spyOn(document, "getElementById").mockReturnValue({
    scrollIntoView: mockScrollIntoView,
  } as unknown as HTMLElement);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── 测试套件 ──────────────────────────────────────────────────────────────

describe("OutlinePanel — 基础渲染", () => {
  it("空文档显示占位文案", () => {
    render(<OutlinePanel />);
    expect(screen.getByText("文档为空")).toBeInTheDocument();
  });

  it("渲染第一层所有 key", () => {
    loadJson(JSON.stringify({ name: "Alice", age: 30, active: true }));
    render(<OutlinePanel />);
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("age")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("不递归渲染子节点（只显示第一层）", () => {
    loadJson(JSON.stringify({ address: { city: "Beijing", zip: "100000" } }));
    render(<OutlinePanel />);
    expect(screen.getByText("address")).toBeInTheDocument();
    // 子节点 city / zip 不应直接出现（未展开时）
    expect(screen.queryByText("city")).not.toBeInTheDocument();
    expect(screen.queryByText("zip")).not.toBeInTheDocument();
  });

  it("容器节点显示子项数量", () => {
    loadJson(JSON.stringify({ tags: ["a", "b", "c"] }));
    render(<OutlinePanel />);
    // 3 个子项
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("OutlinePanel — 点击跳转", () => {
  it("点击节点调用 scrollIntoView", () => {
    loadJson(JSON.stringify({ name: "Alice" }));
    render(<OutlinePanel />);

    const node = screen.getByRole("button", { name: /跳转到 name/ });
    fireEvent.click(node);

    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });
  });

  it("按 Enter 键也触发 scrollIntoView", () => {
    loadJson(JSON.stringify({ score: 99 }));
    render(<OutlinePanel />);

    const node = screen.getByRole("button", { name: /跳转到 score/ });
    fireEvent.keyDown(node, { key: "Enter" });

    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });
  });
});

describe("OutlinePanel — 展开/折叠", () => {
  it("嵌套 object 显示展开图标", () => {
    loadJson(JSON.stringify({ address: { city: "Beijing" } }));
    render(<OutlinePanel />);
    // 有展开按钮（aria-label 展开）
    expect(screen.getByRole("button", { name: "展开" })).toBeInTheDocument();
  });

  it("点击展开图标显示一级子节点", () => {
    loadJson(JSON.stringify({ address: { city: "Beijing", zip: "100000" } }));
    render(<OutlinePanel />);

    const expandBtn = screen.getByRole("button", { name: "展开" });
    fireEvent.click(expandBtn);

    expect(screen.getByText("city")).toBeInTheDocument();
    expect(screen.getByText("zip")).toBeInTheDocument();
  });

  it("再次点击展开图标折叠子节点", () => {
    loadJson(JSON.stringify({ address: { city: "Beijing" } }));
    render(<OutlinePanel />);

    const expandBtn = screen.getByRole("button", { name: "展开" });
    fireEvent.click(expandBtn); // 展开

    const collapseBtn = screen.getByRole("button", { name: "收起" });
    fireEvent.click(collapseBtn); // 折叠

    expect(screen.queryByText("city")).not.toBeInTheDocument();
  });

  it("展开后点击子节点调用 scrollIntoView", () => {
    loadJson(JSON.stringify({ address: { city: "Beijing" } }));
    render(<OutlinePanel />);

    fireEvent.click(screen.getByRole("button", { name: "展开" }));

    const childNode = screen.getByRole("button", { name: /跳转到 city/ });
    fireEvent.click(childNode);

    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });
  });

  it("展开后子节点不再展开（最多一层）", () => {
    // 子节点是 object，也不应有展开按钮
    loadJson(JSON.stringify({ meta: { info: { deep: true } } }));
    render(<OutlinePanel />);

    fireEvent.click(screen.getByRole("button", { name: "展开" }));

    // info 是子节点中的 object，展开后不应出现其展开按钮（子节点行不允许继续展开）
    expect(screen.queryAllByRole("button", { name: "展开" })).toHaveLength(0);
  });
});

describe("OutlinePanel — 只读保证", () => {
  it("操作大纲不调用任何写 Store 方法", () => {
    loadJson(JSON.stringify({ name: "Alice", address: { city: "BJ" } }));

    const store = useDocumentStore.getState();
    const spyUpdate = vi.spyOn(store, "updateEntryKey");
    const spyInsert = vi.spyOn(store, "insertEntry");
    const spyDelete = vi.spyOn(store, "deleteEntry");
    const spyMove = vi.spyOn(store, "moveEntry");
    const spyToggle = vi.spyOn(store, "toggleCollapsed");

    render(<OutlinePanel />);

    // 点击节点
    fireEvent.click(screen.getByRole("button", { name: /跳转到 name/ }));

    // 展开 address
    fireEvent.click(screen.getByRole("button", { name: "展开" }));
    // 点击子节点
    fireEvent.click(screen.getByRole("button", { name: /跳转到 city/ }));

    expect(spyUpdate).not.toHaveBeenCalled();
    expect(spyInsert).not.toHaveBeenCalled();
    expect(spyDelete).not.toHaveBeenCalled();
    expect(spyMove).not.toHaveBeenCalled();
    expect(spyToggle).not.toHaveBeenCalled();
  });
});

describe("OutlinePanel — EntryCard id 绑定", () => {
  it("EntryCard 根元素 id 与 entry.id 一致（scrollIntoView 能找到目标）", () => {
    loadJson(JSON.stringify({ hello: "world" }));
    const root = useDocumentStore.getState().root;
    // 取第一个 entry 的 id
    const entryId =
      root.kind === "entries" || root.kind === "array"
        ? root.children[0]?.id
        : undefined;
    expect(entryId).toBeDefined();

    // 渲染 OutlinePanel（测试中没有 EntryCard，只验证 getElementById 路径合法性）
    // 在真实 DOM 中 EntryCard 根元素会有 id=entry.id，此测试确认 id 是已知的
    // 实际 DOM id 挂载在 visual-canvas.test.tsx 的集成场景中验证
    expect(typeof entryId).toBe("string");
    expect(entryId!.length).toBeGreaterThan(0);
  });
});
