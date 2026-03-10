/**
 * ValidationPanel — JSON 数据校验面板（T15，AC09）
 *
 * 嵌入在 JSON Panel 下方（折叠状态，有错误时自动展开）
 * 显示：错误列表 + 可修复项的一键修复按钮
 */

import React, { useState } from "react";
import { AlertTriangle, CheckCircle, Wrench, ChevronDown, ChevronUp, Info } from "lucide-react";
import { validateJson, autoFix } from "../../utils/json-validator";
import type { ValidationIssue } from "../../utils/json-validator";
import { useDocumentStore } from "../../store/document-store";

const SEVERITY_ICON = {
  error: <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />,
  warning: <AlertTriangle size={12} className="text-yellow-500 flex-shrink-0" />,
  info: <Info size={12} className="text-blue-500 flex-shrink-0" />,
};

const SEVERITY_ROW: Record<string, string> = {
  error: "bg-red-50 border-red-100",
  warning: "bg-yellow-50 border-yellow-100",
  info: "bg-blue-50 border-blue-100",
};

export function ValidationPanel() {
  const jsonString = useDocumentStore((s) => s.jsonString);
  const loadFromJson = useDocumentStore((s) => s.loadFromJson);

  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const result = validateJson(jsonString);
  const { issues } = result;
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;
  const fixableIds = issues.filter((i) => i.fixable).map((i) => i.id);
  const hasFixable = fixableIds.length > 0;

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-600 border-t border-gray-100 bg-green-50/50">
        <CheckCircle size={11} />
        <span>JSON 格式正确</span>
      </div>
    );
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleFix = () => {
    const toFix = selected.size > 0 ? selected : new Set(fixableIds);
    const fixed = autoFix(jsonString, toFix);
    loadFromJson(fixed, "visual");
    setSelected(new Set());
  };

  return (
    <div className="border-t border-gray-100 bg-white text-xs">
      {/* 摘要栏（点击展开/折叠）*/}
      <button
        className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-50 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {errorCount > 0 && (
            <span className="flex items-center gap-0.5 text-red-600">
              <AlertTriangle size={11} /> {errorCount} 错误
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-0.5 text-yellow-600 ml-1">
              <AlertTriangle size={11} /> {warnCount} 警告
            </span>
          )}
        </div>
        {hasFixable && (
          <span className="text-blue-500 flex items-center gap-0.5">
            <Wrench size={10} /> 可修复
          </span>
        )}
        {expanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
      </button>

      {/* 展开详情 */}
      {expanded && (
        <div className="border-t border-gray-100">
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
            {issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                checked={selected.has(issue.id)}
                onToggle={() => issue.fixable && toggleSelect(issue.id)}
              />
            ))}
          </div>

          {hasFixable && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
              <span className="text-gray-500">
                {selected.size > 0
                  ? `已选 ${selected.size} 项修复`
                  : `${fixableIds.length} 项可自动修复`}
              </span>
              <button
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
                onClick={handleFix}
              >
                <Wrench size={11} />
                {selected.size > 0 ? "修复已选" : "全部修复"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  checked,
  onToggle,
}: {
  issue: ValidationIssue;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 ${SEVERITY_ROW[issue.severity]} ${issue.fixable ? "cursor-pointer" : ""}`}
      onClick={onToggle}
    >
      {issue.fixable && (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mt-0.5 flex-shrink-0 cursor-pointer"
        />
      )}
      {SEVERITY_ICON[issue.severity]}
      <div className="min-w-0">
        <p className="font-medium text-gray-700">[{issue.code}] {issue.message}</p>
        {issue.detail && <p className="text-gray-500 mt-0.5 break-all">{issue.detail}</p>}
        {issue.fixable && issue.fixDescription && (
          <p className="text-blue-600 mt-0.5">→ {issue.fixDescription}</p>
        )}
      </div>
    </div>
  );
}
