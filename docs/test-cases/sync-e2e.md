# E2E 测试用例 — 双向同步（T07）

**组件**: `JsonPanel` ↔ `DocumentStore` ↔ `VisualCanvas`  
**测试类型**: 手动验证（需要 Tauri dev 或浏览器环境）  
**关联文件**:
- `src/components/editor/JsonPanel.tsx`
- `src/store/document-store.ts`（`lastChangeSource` 防死循环标记）
- `docs/spikes/spike-cm6-cursor.md`（光标保留设计依据）

---

## TC-SYNC-01：Visual 编辑 → JSON Panel 更新，光标不跳位

**目的**: 验证 Visual → Store → JSON Panel 正向路径，光标保留

**前置**: 打开 `{"name":"Alice","age":30}`

**步骤**:
1. 在 JSON Panel 点击，将光标定位到 `"age": 30` 行末（字符偏移约 27）
2. 在 Visual 区双击 `name` 的值 `"Alice"`，改为 `"Bob"`，回车
3. 观察 JSON Panel

**预期**:
- JSON Panel 内容更新为 `{"name":"Bob","age":30}`
- 光标仍在 `age` 行附近（允许因字符偏移微小漂移，不得跳回行首）
- VisualCanvas 显示 `name: "Bob"`
- 无死循环（DevTools Console 无大量重复 log）

**死循环验证**:
在 `JsonPanel.tsx` updateListener 顶部加 `console.count('CM6 update')`;
快速编辑 Visual 3 次，`CM6 update` 应只触发 3 次外部更新（不应指数增长）

---

## TC-SYNC-02：JSON Panel 编辑合法 JSON → Visual 更新

**目的**: 验证 JSON Panel → Store → Visual 反向路径

**前置**: 打开 `{"x":1}`

**步骤**:
1. 在 JSON Panel 将 `1` 改为 `999`，停止输入 300ms
2. 观察 Visual 区

**预期**:
- Visual 中 `x` 卡片的值更新为 `999`
- JSON Panel 内容不变（自身触发，不反向覆盖）
- `lastChangeSource` = `'json'`（可在 Redux DevTools 或 console 验证）

---

## TC-SYNC-03：JSON Panel 输入非法 JSON → 错误提示，Visual 不变

**目的**: 验证错误处理路径

**前置**: 打开 `{"a":1}`

**步骤**:
1. 在 JSON Panel 将内容改为 `{"a": ` (不完整)，停止 300ms
2. 观察 Visual 区和错误提示

**预期**:
- VisualCanvas 顶部出现红色错误提示条（"JSON 语法错误"）
- Visual 卡片内容保持 `{"a":1}` 不变（Store root 未被替换）
- `lastChangeSource` = `'json'`（确保 Visual 不会因 source=json 触发不必要重渲染）
- 修复 JSON Panel 内容后，错误提示消失，Visual 正常更新

---

## TC-SYNC-04：Visual 快速连续编辑，JSON Panel 跟随，无死循环

**目的**: 验证 `_scheduleHistoryCommit` + 防抖 300ms 路径不导致死循环

**前置**: 打开 `{"text":"hello"}`

**步骤**:
1. 在 JSON Panel updateListener 顶部加 `console.count('CM6-listener')`
2. 在 Visual 双击 `text` 的值，快速连续输入 `helloabc`（每次按键都触发 onChange）
3. 等待 500ms（batch timer 触发）
4. 查看 Console

**预期**:
- JSON Panel 随每次 Visual dispatch 更新内容（`source=visual` 触发 useEffect 差量更新）
- `CM6-listener` 触发次数 = Visual onChange 次数（不翻倍，无死循环）
- 500ms 后 undoStack 新增 1 个节点（batch 提交）
- Undo 回到 `"hello"`

---

## TC-SYNC-05：JSON Panel 粘贴大段 JSON，防抖 300ms 后 Visual 更新

**目的**: 验证防抖在粘贴场景的正确性

**前置**: 空文档 `{}`

**步骤**:
1. 选中 JSON Panel 全部内容
2. 粘贴以下 JSON（约 20 个字段）:
   ```json
   {"a":1,"b":2,"c":3,"d":4,"e":5,"f":6,"g":7,"h":8,"i":9,"j":10,
    "k":11,"l":12,"m":13,"n":14,"o":15,"p":16,"q":17,"r":18,"s":19,"t":20}
   ```
3. 立刻观察 Visual（不等待）
4. 等待 300ms 后再观察

**预期**:
- 粘贴后 300ms 内：Visual 仍显示空文档（防抖未触发）
- 300ms 后：Visual 渲染 20 张卡片
- 无内存异常，无卡顿感知

---

## TC-SYNC-06：光标漂移边界（已知 P2 遗留）

**目的**: 记录当前行为，防止回归

**步骤**:
1. JSON Panel 中光标定位在 `"Alice"` 中间（字符 n）
2. 在 Visual 触发 JSON 格式化（缩进变化）

**预期（P0 可接受）**:
- 光标跳到 `Math.min(oldPos, newLength)` 位置
- 不发生崩溃，不丢失整个文档内容

**P2 改进方向**:
- 用 `json-source-map` 做路径级映射，格式化后光标精确还原到对应 key/value 位置

---

## 测试通过标准

所有 TC-SYNC-01 ~ TC-SYNC-05 手动验证通过后，T07 可提交 QA 验收。  
TC-SYNC-06 记录当前行为即可，不阻塞。
