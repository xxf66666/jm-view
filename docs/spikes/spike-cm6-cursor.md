# Spike: CodeMirror 6 防抖同步 + 光标保留

**任务**: T04 Spike  
**日期**: 2026-03-10  
**状态**: ✅ 通过，T05 可开工  
**实现文件**: `src/components/editor/JsonPanel.spike.tsx`

---

## 背景

P0 阶段的核心风险点：JSON Panel（CodeMirror 6）接收来自可视化区的外部内容变更时，
若用全量替换 EditorState（即重新 `setState`），光标会跳回 0，用户体验差。
同时，防抖逻辑若实现不当，父组件每次 render 产生新函数引用时 debounce timer 会被提前重置。

---

## 验证项目与结论

### 1. 差量替换保持光标位置

**方案**:
```ts
view.dispatch(view.state.update({
  changes: { from: 0, to: view.state.doc.length, insert: newValue },
  selection: {
    anchor: Math.min(oldFrom, newValue.length),
    head: Math.min(oldTo, newValue.length),
  },
  annotations: [
    ExternalChangeAnnotation.of("visual"),
    Transaction.addToHistory.of(false),
  ],
}));
```

**结论**: ✅ 可行。  
对于普通 JSON 字段修改场景，光标位置基本保持（字符偏移未大幅变化）。  
**遗留优化（P2）**: JSON 格式化（换行/缩进变化）后，字符偏移会漂移，需用 `json-source-map`
做路径级映射才能精确还原。P0 阶段接受"格式化后光标跳到合理位置"。

---

### 2. 防抖 300ms — `useDebounce` 实现

**问题**: `useCallback([fn, delay])` 当 `fn`（来自 props 的 `onUserEdit`）
每次父组件 render 时产生新引用，会导致 callback 每次都重建，debounce timer 被提前重置，
防抖在用户连续快速输入时失效。

**方案**:
```ts
const callbackRef = useRef(fn);
useEffect(() => { callbackRef.current = fn; }, [fn]);

return useCallback((value: string) => {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => callbackRef.current(value), delay);
}, [delay]); // fn 不进 deps，通过 callbackRef 追踪
```

**结论**: ✅ 可行。`delay` 不变则 callback 不重建，timer 不被意外重置。  
**遗留问题（T08 完善）**: 焦点离开时应立即触发（不等 300ms），需在 `blur` 事件处理中 `flushSync`。

---

### 3. source 标记防死循环

**方案**:
```ts
// Dispatch 时标记来源
annotations: [ExternalChangeAnnotation.of("visual")]

// updateListener 中检查
const isFromExternal = update.transactions.some(
  tr => tr.annotation(ExternalChangeAnnotation) === "visual"
);
if (isFromExternal || isExternalUpdateRef.current) return;
```

**结论**: ✅ 逻辑正确。视觉区 → Store → JSON Panel 路径不会反向触发 `onUserEdit`。  
`Transaction.addToHistory.of(false)` 同时保证外部变更不污染撤销栈。  
**测试点（T08 集成时验证）**: 与 Document Store dispatch 的端到端死循环测试。

---

## 遗留优化清单

| 优先级 | 描述 | 计划阶段 |
|--------|------|----------|
| P2 | 格式化后光标精确保留（json-source-map 路径映射） | T08 优化 |
| T08 | blur 时立即触发防抖回调（不等 300ms） | T08 实现 |
| T08 | 与 Document Store 的端到端死循环测试 | T08 集成 |

---

## 结论

**三个核心风险点均已验证可行，T05/T02/T03 可正式并行开工。**

方案已在 `src/components/editor/JsonPanel.spike.tsx` 中完整实现，
T08 实现真实 JSON Panel 时直接基于此 spike 扩展即可。
