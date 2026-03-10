import React from "react";

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Left: Outline Panel */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 font-semibold text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
          大纲
        </div>
        <div className="p-4 text-sm text-gray-400">大纲面板（待实现 T08）</div>
      </aside>

      {/* Center: Visual Canvas */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="text-sm text-gray-400">可视化编辑区（待实现 T06）</div>
      </main>

      {/* Right: JSON Source Panel */}
      <aside className="w-80 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 font-semibold text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
          JSON 源码
        </div>
        <div className="p-4 text-sm text-gray-400">JSON 面板（待实现 T05）</div>
      </aside>
    </div>
  );
}

export default App;
