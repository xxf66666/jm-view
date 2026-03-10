/**
 * visual-canvas.test.tsx — T05 验收测试
 *
 * AC01: 打开合法 JSON，卡片正确渲染
 * 覆盖场景：
 * - string / number / boolean / null / object / array 卡片渲染
 * - 嵌套 object 展开/折叠
 * - 删除操作
 * - 添加根节点
 * - 空文档占位
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { VisualCanvas } from "../../src/components/visual/VisualCanvas";
import { useDocumentStore } from "../../src/store/document-store";

// ── 重置 store ────────────────────────────────────────────────────────────

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

// ── AC01 测试 ─────────────────────────────────────────────────────────────

describe("VisualCanvas — AC01: 合法 JSON 卡片正确渲染", () => {
  beforeEach(resetStore);

  it("渲染 string 类型节点", () => {
    loadJson('{"name":"Alice"}');
    render(<VisualCanvas />);
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText('"Alice"')).toBeInTheDocument();
    expect(screen.getByText("str")).toBeInTheDocument();
  });

  it("渲染 number 类型节点", () => {
    loadJson('{"age":30}');
    render(<VisualCanvas />);
    expect(screen.getByText("age")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("num")).toBeInTheDocument();
  });

  it("渲染 boolean 类型节点（true）", () => {
    loadJson('{"active":true}');
    render(<VisualCanvas />);
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
    expect(screen.getByText("bool")).toBeInTheDocument();
  });

  it("渲染 null 类型节点", () => {
    loadJson('{"notes":null}');
    render(<VisualCanvas />);
    expect(screen.getByText("notes")).toBeInTheDocument();
    // "null" 出现两次：TypeBadge 标签 + 值显示（italic），用 getAllByText
    const nullEls = screen.getAllByText("null");
    expect(nullEls.length).toBeGreaterThanOrEqual(1);
  });

  it("渲染 object 类型节点，显示子节点数量", () => {
    loadJson('{"addr":{"city":"Beijing","zip":"100000"}}');
    render(<VisualCanvas />);
    expect(screen.getByText("addr")).toBeInTheDocument();
    // TypeBadge 显示 "{ } 2"
    expect(screen.getByText(/\{ \} 2/)).toBeInTheDocument();
  });

  it("渲染 array 类型节点，显示子节点数量", () => {
    loadJson('{"tags":["a","b","c"]}');
    render(<VisualCanvas />);
    expect(screen.getByText("tags")).toBeInTheDocument();
    expect(screen.getByText(/\[ \] 3/)).toBeInTheDocument();
  });

  it("多个根节点全部渲染", () => {
    loadJson('{"a":1,"b":"hello","c":true}');
    render(<VisualCanvas />);
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument();
    // 计数显示
    expect(screen.getByText("3 项")).toBeInTheDocument();
  });

  it("空文档显示占位提示", () => {
    // store 已是空
    render(<VisualCanvas />);
    expect(screen.getByText("空文档")).toBeInTheDocument();
    expect(screen.getByText("添加第一个节点")).toBeInTheDocument();
  });

  it("parseError 时显示错误提示条", () => {
    loadJson('{"a":1}'); // 先加载合法 JSON
    render(<VisualCanvas />);
    act(() => {
      useDocumentStore.getState().loadFromJson("{invalid}", "json");
    });
    expect(screen.getByText(/JSON 语法错误/)).toBeInTheDocument();
  });
});

// ── 交互测试 ──────────────────────────────────────────────────────────────

describe("VisualCanvas — 交互", () => {
  beforeEach(resetStore);

  it("点击对象卡片折叠/展开子节点", () => {
    loadJson('{"obj":{"x":1}}');
    render(<VisualCanvas />);

    // 初始：x 可见
    expect(screen.getByText("x")).toBeInTheDocument();

    // 点击 obj 折叠
    fireEvent.click(screen.getByText("obj").closest("[class*='cursor-pointer']")!);
    // x 不再渲染（父折叠）
    expect(screen.queryByText("x")).toBeNull();

    // 再次点击展开
    fireEvent.click(screen.getByText("obj").closest("[class*='cursor-pointer']")!);
    expect(screen.getByText("x")).toBeInTheDocument();
  });

  it("点击添加按钮，在空文档中添加根节点", () => {
    render(<VisualCanvas />);
    fireEvent.click(screen.getByText("添加第一个节点"));
    // store 中应有 1 个节点
    const children = useDocumentStore.getState().root;
    expect(children.kind !== "scalar" && children.children.length).toBe(1);
  });

  it("点击工具栏删除后可 undo 恢复", () => {
    loadJson('{"a":1}');
    render(<VisualCanvas />);

    // undo 按钮初始禁用（loadFromJson 来自 file，_commitHistory 推了快照）
    // 模拟删除
    act(() => {
      const root = useDocumentStore.getState().root;
      if (root.kind !== "scalar") {
        useDocumentStore.getState().deleteEntry([root.children[0].id]);
      }
    });
    // 现在可以 undo
    expect(useDocumentStore.getState().undoStack.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTitle("撤销 (Ctrl+Z)"));
    const root = useDocumentStore.getState().root;
    expect(root.kind !== "scalar" && root.children.length).toBe(1);
  });
});
