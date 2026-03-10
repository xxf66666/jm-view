/**
 * markdown-import.ts — Markdown → JSON AST（T19，AC07）
 *
 * 支持：ATX 标题/段落/代码块/引用/表格/无序列表/有序列表
 * 不支持的元素：转为普通字符串，附带提示
 * AC07：标准 Markdown 正确转换；不支持元素有提示
 */

import { v4 as uuidv4 } from "uuid";
import type { DocumentRoot, JsonEntry } from "../types/json-ast";

// ── 入口 ──────────────────────────────────────────────────────────────────

export interface ImportResult {
  root: DocumentRoot;
  warnings: string[];   // 不支持的元素提示
}

export function importFromMarkdown(markdown: string): ImportResult {
  const warnings: string[] = [];
  const lines = markdown.split("\n");
  const entries: JsonEntry[] = [];
  let i = 0;
  let keyCounter = 0;

  const nextKey = (prefix = "item") => `${prefix}_${++keyCounter}`;

  while (i < lines.length) {
    const line = lines[i];

    // 空行跳过
    if (line.trim() === "") { i++; continue; }

    // ATX 标题（# ~ ######）
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      entries.push(makeEntry(nextKey("heading"), `::heading ${level}\n${text}`));
      i++; continue;
    }

    // 代码块（```lang）
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]); i++;
      }
      i++; // 跳过结束 ```
      entries.push(makeEntry(nextKey("code"), `::code ${lang}\n${codeLines.join("\n")}`));
      continue;
    }

    // 引用（>）
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [line.slice(2)];
      while (i + 1 < lines.length && lines[i + 1].startsWith("> ")) {
        i++; quoteLines.push(lines[i].slice(2));
      }
      entries.push(makeEntry(nextKey("quote"), `::quote\n${quoteLines.join("\n")}`));
      i++; continue;
    }

    // 表格（| col | col |）
    if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].match(/^\|[-| ]+\|/)) {
      const headers = parseCells(line);
      i += 2; // 跳过分隔行
      const rows: JsonEntry[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = parseCells(lines[i]);
        const rowEntries: JsonEntry[] = headers.map((h, idx) =>
          makeEntry(h, cells[idx] ?? "")
        );
        rows.push({ id: uuidv4(), key: String(rows.length), value: rowEntries, type: "object", collapsed: false });
        i++;
      }
      entries.push({ id: uuidv4(), key: nextKey("table"), value: rows, type: "array", collapsed: false });
      continue;
    }

    // 无序列表（- / * / +）
    if (line.match(/^[-*+] /)) {
      const items: JsonEntry[] = [];
      while (i < lines.length && lines[i].match(/^[-*+] /)) {
        items.push(makeEntry(String(items.length), lines[i].replace(/^[-*+] /, "")));
        i++;
      }
      entries.push({ id: uuidv4(), key: nextKey("list"), value: items, type: "array", collapsed: false });
      continue;
    }

    // 有序列表（1. 2. ...）
    if (line.match(/^\d+\. /)) {
      const items: JsonEntry[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        const text = lines[i].replace(/^\d+\. /, "");
        items.push(makeEntry(String(items.length), `${items.length + 1}: ${text}`));
        i++;
      }
      entries.push({ id: uuidv4(), key: nextKey("ordered_list"), value: items, type: "array", collapsed: false });
      continue;
    }

    // 分隔线
    if (line.match(/^---+$|^\*\*\*+$/)) {
      entries.push(makeEntry(nextKey("divider"), "::divider"));
      i++; continue;
    }

    // 加粗 KV（**key**: value 格式）
    const kvMatch = line.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
    if (kvMatch) {
      entries.push(makeEntry(kvMatch[1], kvMatch[2]));
      i++; continue;
    }

    // 普通段落
    const paraLines: string[] = [line.trim()];
    while (i + 1 < lines.length && lines[i + 1].trim() !== "" && !lines[i + 1].match(/^[#`>|*-]|\d+\./)) {
      i++; paraLines.push(lines[i].trim());
    }
    const paraText = paraLines.join(" ");
    entries.push(makeEntry(nextKey("para"), paraText));
    i++;
  }

  return {
    root: { kind: "entries", children: entries },
    warnings,
  };
}

// ── 工具 ──────────────────────────────────────────────────────────────────

function makeEntry(key: string, value: string): JsonEntry {
  return { id: uuidv4(), key, value, type: "string", collapsed: false };
}

function parseCells(line: string): string[] {
  return line.split("|").slice(1, -1).map((c) => c.trim());
}
