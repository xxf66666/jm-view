/**
 * markdown-export.ts — JSON AST → Markdown（T18，AC06）
 *
 * 支持：标题/段落/代码/引用/表格/图片/列表
 * 含附件：Base64 data URI 图片提取为独立文件（在 Tauri 环境里写到同目录）
 */

import type { JsonEntry, DocumentRoot } from "../types/json-ast";

export interface ExportedFile {
  path: string;      // 相对路径（如 "attachments/img_0.png"）
  base64: string;    // 不含 data:xxx;base64, 前缀
  mimeType: string;
}

export interface MarkdownExportResult {
  markdown: string;
  attachments: ExportedFile[];
}

// ── 入口 ──────────────────────────────────────────────────────────────────

export function exportToMarkdown(root: DocumentRoot): MarkdownExportResult {
  const attachments: ExportedFile[] = [];
  const entries = root.kind === "scalar" ? [root.entry] : root.children;
  const lines = entryListToMarkdown(entries, 0, attachments);
  return { markdown: lines.join("\n"), attachments };
}

// ── 递归转换 ──────────────────────────────────────────────────────────────

function entryListToMarkdown(
  entries: JsonEntry[],
  depth: number,
  attachments: ExportedFile[]
): string[] {
  const lines: string[] = [];

  for (const entry of entries) {
    lines.push(...entryToMarkdown(entry, depth, attachments));
  }
  return lines;
}

function entryToMarkdown(
  entry: JsonEntry,
  depth: number,
  attachments: ExportedFile[]
): string[] {
  const indent = "  ".repeat(depth);

  // 特殊块（:: 前缀）
  if (entry.type === "string" && typeof entry.value === "string" && entry.value.startsWith("::")) {
    return blockToMarkdown(entry.key, entry.value, attachments);
  }

  // object
  if (entry.type === "object" && Array.isArray(entry.value)) {
    const lines: string[] = [];
    lines.push(`${indent}## ${entry.key}`);
    lines.push(...entryListToMarkdown(entry.value as JsonEntry[], depth + 1, attachments));
    return lines;
  }

  // array（对象数组 → 表格）
  if (entry.type === "array" && Array.isArray(entry.value)) {
    const children = entry.value as JsonEntry[];
    if (children.length > 0 && children[0].type === "object") {
      return arrayToMarkdownTable(entry.key, children, depth);
    }
    const lines: string[] = [];
    lines.push(`${indent}**${entry.key}**`);
    for (const child of children) {
      lines.push(`${indent}- ${child.value === null ? "null" : String(child.value)}`);
    }
    return lines;
  }

  // null
  if (entry.type === "null") return [`${indent}**${entry.key}**: _null_`];

  // boolean
  if (entry.type === "boolean") return [`${indent}**${entry.key}**: \`${entry.value}\``];

  // number / string
  const valStr = entry.type === "string"
    ? String(entry.value).replace(/\n/g, "  \n")
    : String(entry.value ?? "");

  return [`${indent}**${entry.key}**: ${valStr}`];
}

// ── 特殊块转 Markdown ─────────────────────────────────────────────────────

function blockToMarkdown(key: string, raw: string, attachments: ExportedFile[]): string[] {
  const typeEnd = raw.indexOf(" ") > 2 ? raw.indexOf(" ") : raw.indexOf("\n") > 2 ? raw.indexOf("\n") : raw.length;
  const blockType = raw.slice(2, typeEnd).toLowerCase();
  const rest = raw.slice(typeEnd + 1);
  const [meta = "", ...contentLines] = rest.split("\n");
  const content = contentLines.join("\n");

  switch (blockType) {
    case "code":
      return ["```" + (meta || ""), content || "", "```"];
    case "quote":
      return (content || meta).split("\n").map((l) => `> ${l}`);
    case "heading": {
      const level = Math.min(6, Math.max(1, parseInt(meta) || 2));
      return [`${"#".repeat(level)} ${content || meta}`];
    }
    case "image": {
      const src = content.trim();
      if (src.startsWith("data:")) {
        const mimeMatch = src.match(/^data:([^;]+);base64,(.+)/);
        if (mimeMatch) {
          const [, mime, b64] = mimeMatch;
          const ext = mime.split("/")[1] || "bin";
          const idx = attachments.length;
          const fname = `attachments/img_${idx}.${ext}`;
          attachments.push({ path: fname, base64: b64, mimeType: mime });
          return [`![${meta}](./${fname})`];
        }
      }
      return [`![${meta}](${src})`];
    }
    case "math": case "latex":
      return ["$$", content || meta, "$$"];
    case "divider":
      return ["---"];
    case "callout": case "note": case "tip": case "warning":
      return [`> **[${blockType.toUpperCase()}]** ${content || meta}`];
    default:
      return [`_[${blockType}]_ ${content || meta}`];
  }
}

// ── 对象数组 → Markdown 表格 ──────────────────────────────────────────────

function arrayToMarkdownTable(key: string, rows: JsonEntry[], depth: number): string[] {
  const indent = "  ".repeat(depth);
  const lines: string[] = [`${indent}### ${key}`];

  const cols = new Set<string>();
  rows.forEach((row) => (row.value as JsonEntry[]).forEach((c) => cols.add(c.key)));
  const colArr = [...cols];

  lines.push(`${indent}| ${colArr.join(" | ")} |`);
  lines.push(`${indent}| ${colArr.map(() => "---").join(" | ")} |`);
  for (const row of rows) {
    const map = new Map((row.value as JsonEntry[]).map((c) => [c.key, c.value]));
    lines.push(`${indent}| ${colArr.map((c) => String(map.get(c) ?? "")).join(" | ")} |`);
  }
  return lines;
}
