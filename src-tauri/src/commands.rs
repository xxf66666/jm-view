/// Tauri IPC commands — 文件系统操作（T09/T13）
///
/// 实现：
/// - fs_open_file:    打开文件选择对话框，读取 JSON 内容
/// - fs_save_file:    将内容写入指定路径
/// - fs_new_file:     新建空白文档（返回空 JSON）
/// - fs_save_draft:   草稿自动保存（T16 完整实现）
/// - fs_list_drafts:  列出待恢复草稿
/// - fs_restore_draft:恢复草稿内容
/// - fs_delete_draft: 删除草稿

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

// ── 返回类型 ──────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OpenFileResult {
    pub path: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DraftInfo {
    pub draft_id: String,
    pub doc_id: String,
    pub saved_at: String,
    pub size: u64,
}

// ── 草稿目录 ──────────────────────────────────────────────────────────────

fn drafts_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 app data 目录: {e}"))?;
    let drafts = data_dir.join("drafts");
    fs::create_dir_all(&drafts)
        .map_err(|e| format!("无法创建草稿目录: {e}"))?;
    Ok(drafts)
}

// ── T13: 打开本地 JSON 文件 ───────────────────────────────────────────────

#[tauri::command]
pub async fn fs_open_file(app: AppHandle) -> Result<OpenFileResult, String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app
        .dialog()
        .file()
        .add_filter("JSON 文件", &["json"])
        .add_filter("所有文件", &["*"])
        .blocking_pick_file();

    let Some(path) = file_path else {
        return Err("user_cancelled".to_string());
    };

    let path_str = path
        .to_str()
        .ok_or("路径包含非 UTF-8 字符")?
        .to_string();

    let content = fs::read_to_string(&path_str)
        .map_err(|e| format!("读取文件失败: {e}"))?;

    Ok(OpenFileResult {
        path: path_str,
        content,
    })
}

// ── T13: 保存文件 ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn fs_save_file(path: String, content: String) -> Result<(), String> {
    // 原子写入：先写临时文件，再 rename（防止写入中途崩溃丢失原文件）
    let target = PathBuf::from(&path);
    let parent = target.parent().ok_or("无效的文件路径")?;
    let tmp_path = parent.join(format!(
        ".jmview_tmp_{}.json",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    ));

    fs::write(&tmp_path, &content)
        .map_err(|e| format!("写入临时文件失败: {e}"))?;

    fs::rename(&tmp_path, &target)
        .map_err(|e| {
            // rename 失败时清理临时文件
            let _ = fs::remove_file(&tmp_path);
            format!("保存文件失败: {e}")
        })?;

    Ok(())
}

// ── T13: 另存为（弹出对话框选路径） ──────────────────────────────────────

#[tauri::command]
pub async fn fs_save_file_as(app: AppHandle, content: String) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let save_path = app
        .dialog()
        .file()
        .add_filter("JSON 文件", &["json"])
        .set_file_name("untitled.json")
        .blocking_save_file();

    let Some(path) = save_path else {
        return Err("user_cancelled".to_string());
    };

    let path_str = path
        .to_str()
        .ok_or("路径包含非 UTF-8 字符")?
        .to_string();

    fs_save_file(path_str.clone(), content).await?;
    Ok(path_str)
}

// ── T16: 自动草稿保存 ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn fs_save_draft(
    app: AppHandle,
    doc_id: String,
    content: String,
) -> Result<(), String> {
    let dir = drafts_dir(&app)?;
    let draft_path = dir.join(format!("{doc_id}.draft.json"));
    let saved_at = chrono::Local::now().to_rfc3339();

    // 草稿文件：包一层元数据包装
    let wrapper = serde_json::json!({
        "draft_id": format!("{doc_id}.draft"),
        "doc_id": doc_id,
        "saved_at": saved_at,
        "content": content,
    });

    let raw = serde_json::to_string(&wrapper)
        .map_err(|e| format!("序列化草稿失败: {e}"))?;

    fs::write(&draft_path, raw)
        .map_err(|e| format!("写入草稿失败: {e}"))?;

    Ok(())
}

// ── T16: 列出草稿 ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn fs_list_drafts(app: AppHandle) -> Result<Vec<DraftInfo>, String> {
    let dir = drafts_dir(&app)?;
    let mut drafts = Vec::new();

    let entries = fs::read_dir(&dir)
        .map_err(|e| format!("读取草稿目录失败: {e}"))?;

    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if !file_name.ends_with(".draft.json") {
            continue;
        }
        if let Ok(raw) = fs::read_to_string(&path) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
                let meta = DraftInfo {
                    draft_id: v["draft_id"].as_str().unwrap_or("").to_string(),
                    doc_id: v["doc_id"].as_str().unwrap_or("").to_string(),
                    saved_at: v["saved_at"].as_str().unwrap_or("").to_string(),
                    size: path.metadata().map(|m| m.len()).unwrap_or(0),
                };
                if !meta.draft_id.is_empty() {
                    drafts.push(meta);
                }
            }
        }
    }

    // 按保存时间倒序
    drafts.sort_by(|a, b| b.saved_at.cmp(&a.saved_at));
    Ok(drafts)
}

// ── T16: 恢复草稿 ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn fs_restore_draft(app: AppHandle, draft_id: String) -> Result<String, String> {
    let dir = drafts_dir(&app)?;
    // draft_id 格式："{doc_id}.draft"，文件名为 "{doc_id}.draft.json"
    let doc_id = draft_id.strip_suffix(".draft").unwrap_or(&draft_id);
    let path = dir.join(format!("{doc_id}.draft.json"));

    let raw = fs::read_to_string(&path)
        .map_err(|e| format!("读取草稿失败: {e}"))?;

    let v: serde_json::Value = serde_json::from_str(&raw)
        .map_err(|e| format!("解析草稿失败: {e}"))?;

    v["content"]
        .as_str()
        .map(str::to_string)
        .ok_or_else(|| "草稿格式异常：缺少 content 字段".to_string())
}

// ── T16: 删除草稿 ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn fs_delete_draft(app: AppHandle, draft_id: String) -> Result<(), String> {
    let dir = drafts_dir(&app)?;
    let doc_id = draft_id.strip_suffix(".draft").unwrap_or(&draft_id);
    let path = dir.join(format!("{doc_id}.draft.json"));

    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("删除草稿失败: {e}"))?;
    }
    Ok(())
}
