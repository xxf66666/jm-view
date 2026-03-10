/**
 * document-store.test.ts — T02 单元测试
 *
 * 覆盖场景：
 * - JSON 解析与序列化（loadFromJson）
 * - insert（insertEntry）
 * - delete（deleteEntry）
 * - move（moveEntry）
 * - undo（undo）
 * - redo（redo）
 * - 嵌套路径操作
 * - 防死循环：lastChangeSource 标记
 * - 解析错误处理
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDocumentStore } from "../../src/store/document-store";
import type { DocumentState } from "../../src/store/document-store";
import type { JsonEntry } from "../../src/types/json-ast";

// ── 测试辅助 ──────────────────────────────────────────────────────────────

/** 重置 store 到初始状态 */
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

function getState(): DocumentState {
  return useDocumentStore.getState();
}

function getRootChildren(): JsonEntry[] {
  const { root } = getState();
  if (root.kind === "scalar") return [];
  return root.children;
}

// ── 测试套件 ──────────────────────────────────────────────────────────────

describe("DocumentStore — loadFromJson", () => {
  beforeEach(resetStore);

  it("解析合法对象 JSON，根节点为 entries", () => {
    act(() => getState().loadFromJson('{"name":"Alice","age":30}', "file"));
    const children = getRootChildren();
    expect(children).toHaveLength(2);
    expect(children[0].key).toBe("name");
    expect(children[0].value).toBe("Alice");
    expect(children[0].type).toBe("string");
    expect(children[1].key).toBe("age");
    expect(children[1].value).toBe(30);
    expect(children[1].type).toBe("number");
  });

  it("解析合法数组 JSON，根节点为 array", () => {
    act(() => getState().loadFromJson('[1, 2, 3]', "file"));
    const { root } = getState();
    expect(root.kind).toBe("array");
    if (root.kind === "array") {
      expect(root.children).toHaveLength(3);
    }
  });

  it("解析错误时设置 parseError，不改变 root", () => {
    act(() => getState().loadFromJson('{"name":"Alice"}', "file"));
    act(() => getState().loadFromJson("{invalid json}", "json"));
    expect(getState().parseError).toBeTruthy();
    // root 保留之前的合法状态
    expect(getRootChildren()[0].key).toBe("name");
  });

  it("source 标记正确记录", () => {
    act(() => getState().loadFromJson("{}", "json"));
    expect(getState().lastChangeSource).toBe("json");
  });

  it("每个节点有唯一 id（uuid 格式）", () => {
    act(() => getState().loadFromJson('{"a":1,"b":2}', "file"));
    const children = getRootChildren();
    const ids = children.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length); // 无重复
    ids.forEach((id) => {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────

describe("DocumentStore — insertEntry", () => {
  beforeEach(() => {
    resetStore();
    act(() => getState().loadFromJson('{"a":1}', "file"));
  });

  it("在根节点末尾插入新条目", () => {
    act(() => getState().insertEntry([], 1, { key: "b", value: 2, type: "number" }));
    const children = getRootChildren();
    expect(children).toHaveLength(2);
    expect(children[1].key).toBe("b");
    expect(children[1].value).toBe(2);
  });

  it("在指定位置插入，顺序正确", () => {
    act(() => getState().insertEntry([], 0, { key: "z", value: "first", type: "string" }));
    const children = getRootChildren();
    expect(children[0].key).toBe("z");
    expect(children[1].key).toBe("a");
  });

  it("插入后 jsonString 更新", () => {
    act(() => getState().insertEntry([], 1, { key: "newKey", value: true, type: "boolean" }));
    const json = JSON.parse(getState().jsonString);
    expect(json.newKey).toBe(true);
  });

  it("lastChangeSource 设为 visual", () => {
    act(() => getState().insertEntry([], 0, { key: "x", value: null, type: "null" }));
    expect(getState().lastChangeSource).toBe("visual");
  });
});

// ──────────────────────────────────────────────────────────────────────────

describe("DocumentStore — deleteEntry", () => {
  let firstId: string;

  beforeEach(() => {
    resetStore();
    act(() => getState().loadFromJson('{"a":1,"b":2,"c":3}', "file"));
    firstId = getRootChildren()[0].id;
  });

  it("删除指定节点", () => {
    act(() => getState().deleteEntry([firstId]));
    const children = getRootChildren();
    expect(children).toHaveLength(2);
    expect(children.find((e) => e.id === firstId)).toBeUndefined();
  });

  it("删除后 jsonString 不含该 key", () => {
    act(() => getState().deleteEntry([firstId]));
    const json = JSON.parse(getState().jsonString);
    expect(json.a).toBeUndefined();
  });

  it("删除不存在的 id 不报错", () => {
    expect(() => {
      act(() => getState().deleteEntry(["non-existent-id"]));
    }).not.toThrow();
    expect(getRootChildren()).toHaveLength(3);
  });
});

// ──────────────────────────────────────────────────────────────────────────

describe("DocumentStore — moveEntry", () => {
  beforeEach(() => {
    resetStore();
    act(() => getState().loadFromJson('{"a":1,"b":2,"c":3}', "file"));
  });

  it("移动第一个到最后", () => {
    act(() => getState().moveEntry([], 0, 2));
    const keys = getRootChildren().map((e) => e.key);
    expect(keys).toEqual(["b", "c", "a"]);
  });

  it("移动最后一个到第一", () => {
    act(() => getState().moveEntry([], 2, 0));
    const keys = getRootChildren().map((e) => e.key);
    expect(keys).toEqual(["c", "a", "b"]);
  });

  it("越界索引不报错，不改变顺序", () => {
    expect(() => {
      act(() => getState().moveEntry([], 0, 99));
    }).not.toThrow();
    // 顺序不变（越界保护）
    const keys = getRootChildren().map((e) => e.key);
    expect(keys).toEqual(["a", "b", "c"]);
  });

  it("移动后 jsonString 顺序正确", () => {
    act(() => getState().moveEntry([], 0, 2));
    const json = getState().jsonString;
    const keyOrder = Object.keys(JSON.parse(json));
    expect(keyOrder).toEqual(["b", "c", "a"]);
  });
});

// ──────────────────────────────────────────────────────────────────────────

describe("DocumentStore — undo / redo", () => {
  beforeEach(() => {
    resetStore();
  });

  it("undo 恢复到上一个状态", () => {
    act(() => getState().loadFromJson('{"a":1}', "file")); // snapshot 1
    act(() => getState().insertEntry([], 1, { key: "b", value: 2, type: "number" })); // snapshot 2
    // 此时 undoStack 有一个快照（insert 前调用了 _commitHistory）
    act(() => getState().undo());
    expect(getRootChildren()).toHaveLength(1);
    expect(getRootChildren()[0].key).toBe("a");
  });

  it("undo 后 redo 恢复", () => {
    act(() => getState().loadFromJson('{"a":1}', "file"));
    act(() => getState().insertEntry([], 1, { key: "b", value: 2, type: "number" }));
    act(() => getState().undo());
    act(() => getState().redo());
    expect(getRootChildren()).toHaveLength(2);
  });

  it("空 undoStack 时 undo 不报错", () => {
    expect(() => act(() => getState().undo())).not.toThrow();
  });

  it("空 redoStack 时 redo 不报错", () => {
    expect(() => act(() => getState().redo())).not.toThrow();
  });

  it("新操作后 redoStack 清空", () => {
    act(() => getState().loadFromJson('{"a":1}', "file"));
    act(() => getState().insertEntry([], 1, { key: "b", value: 2, type: "number" }));
    act(() => getState().undo());
    // undo 后 redoStack 有内容
    expect(getState().redoStack.length).toBe(1);
    // 新操作清空 redoStack
    act(() => getState().deleteEntry([getRootChildren()[0].id]));
    expect(getState().redoStack.length).toBe(0);
  });

  it("多次 undo 可以连续回退", () => {
    act(() => getState().loadFromJson('{"a":1}', "file"));
    act(() => getState().insertEntry([], 1, { key: "b", value: 2, type: "number" }));
    act(() => getState().insertEntry([], 2, { key: "c", value: 3, type: "number" }));

    act(() => getState().undo());
    expect(getRootChildren()).toHaveLength(2);

    act(() => getState().undo());
    expect(getRootChildren()).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────

describe("DocumentStore — 嵌套路径操作", () => {
  let nestedId: string;

  beforeEach(() => {
    resetStore();
    act(() =>
      getState().loadFromJson('{"obj":{"x":10,"y":20}}', "file")
    );
    const objEntry = getRootChildren()[0];
    nestedId = objEntry.id;
  });

  it("更新嵌套节点的值", () => {
    const objEntry = getRootChildren()[0];
    const xEntry = (objEntry.value as JsonEntry[])[0];
    act(() =>
      getState().updateEntryValue([nestedId, xEntry.id], 99, "number")
    );
    const updatedObj = getRootChildren()[0];
    expect((updatedObj.value as JsonEntry[])[0].value).toBe(99);
  });

  it("在嵌套容器中插入条目", () => {
    act(() =>
      getState().insertEntry([nestedId], 2, { key: "z", value: 30, type: "number" })
    );
    const objEntry = getRootChildren()[0];
    const children = objEntry.value as JsonEntry[];
    expect(children).toHaveLength(3);
    expect(children[2].key).toBe("z");
  });

  it("删除嵌套节点", () => {
    const objEntry = getRootChildren()[0];
    const xEntry = (objEntry.value as JsonEntry[])[0];
    act(() => getState().deleteEntry([nestedId, xEntry.id]));
    const updatedObj = getRootChildren()[0];
    expect((updatedObj.value as JsonEntry[])).toHaveLength(1);
    expect((updatedObj.value as JsonEntry[])[0].key).toBe("y");
  });
});

// ──────────────────────────────────────────────────────────────────────────

describe("DocumentStore — 字符级 undo（updateEntryValue 连续输入）", () => {
  beforeEach(() => {
    resetStore();
    act(() => getState().loadFromJson('{"text":"hello"}', "file"));
  });

  it("连续 updateEntryValue 后 undo 回到第一次修改前的状态", async () => {
    const id = getRootChildren()[0].id;
    const originalValue = "hello";

    // 模拟用户连续快速输入：hello → helloa → helloab → helloabc
    act(() => getState().updateEntryValue([id], "helloa", "string"));
    act(() => getState().updateEntryValue([id], "helloab", "string"));
    act(() => getState().updateEntryValue([id], "helloabc", "string"));

    // 等待 500ms batch timer 触发
    await new Promise((r) => setTimeout(r, 600));

    // 此时 undoStack 应有 pre-mutation 快照（"hello" 状态）
    expect(getState().undoStack.length).toBeGreaterThan(0);

    // undo 应该回到 "hello"（输入前状态），而不是 "helloabc"
    act(() => getState().undo());
    const afterUndo = getRootChildren()[0].value;
    expect(afterUndo).toBe(originalValue);
  });

  it("batch 中多次输入只产生一个 undo 节点", async () => {
    const id = getRootChildren()[0].id;

    const undoBefore = getState().undoStack.length;

    // 快速连续输入（都在 500ms 内）
    act(() => getState().updateEntryValue([id], "helloa", "string"));
    act(() => getState().updateEntryValue([id], "helloab", "string"));
    act(() => getState().updateEntryValue([id], "helloabc", "string"));

    // 等待 batch timer
    await new Promise((r) => setTimeout(r, 600));

    // 只新增了一个 undo 节点
    expect(getState().undoStack.length).toBe(undoBefore + 1);
  });

  it("新 batch 的快照是 pre-mutation 状态，而非 post-mutation", async () => {
    const id = getRootChildren()[0].id;

    // 第一次输入
    act(() => getState().updateEntryValue([id], "hello_modified", "string"));

    // _batchStartSnapshot 应该是修改前的状态
    const batchSnap = getState()._batchStartSnapshot;
    expect(batchSnap).not.toBeNull();
    // 快照里的 root 中 text 值应是原始 "hello"，而不是 "hello_modified"
    const snapChildren = batchSnap!.root.kind !== "scalar" ? batchSnap!.root.children : [];
    expect(snapChildren[0]?.value).toBe("hello");
  });

  it("两次独立输入（中间停顿 > 500ms）产生两个 undo 节点", async () => {
    const id = getRootChildren()[0].id;

    act(() => getState().updateEntryValue([id], "hello_1", "string"));
    // 等 batch 提交
    await new Promise((r) => setTimeout(r, 600));

    const afterFirst = getState().undoStack.length;

    act(() => getState().updateEntryValue([id], "hello_2", "string"));
    await new Promise((r) => setTimeout(r, 600));

    expect(getState().undoStack.length).toBe(afterFirst + 1);

    // 两次 undo 回到原始 "hello"
    act(() => getState().undo()); // hello_1 → batch 起点（hello）? 这里是第2次batch, undo到hello_1
    act(() => getState().undo()); // 回到 hello
    expect(getRootChildren()[0].value).toBe("hello");
  });
});

describe("DocumentStore — toggleCollapsed", () => {
  beforeEach(() => {
    resetStore();
    act(() => getState().loadFromJson('{"obj":{"x":1}}', "file"));
  });

  it("折叠/展开节点", () => {
    const id = getRootChildren()[0].id;
    expect(getRootChildren()[0].collapsed).toBe(false);
    act(() => getState().toggleCollapsed([id]));
    expect(getRootChildren()[0].collapsed).toBe(true);
    act(() => getState().toggleCollapsed([id]));
    expect(getRootChildren()[0].collapsed).toBe(false);
  });

  it("折叠操作不进撤销栈", () => {
    const id = getRootChildren()[0].id;
    const undoLenBefore = getState().undoStack.length;
    act(() => getState().toggleCollapsed([id]));
    expect(getState().undoStack.length).toBe(undoLenBefore);
  });
});
