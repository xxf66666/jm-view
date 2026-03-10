/// Tauri IPC commands — file system operations
/// Stub implementations for T01 scaffold; full implementation in T09.
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct OpenFileResult {
    pub path: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DraftInfo {
    pub draft_id: String,
    pub doc_id: String,
    pub saved_at: String,
    pub size: u64,
}

// T09: Open a local JSON file via system dialog
#[tauri::command]
pub async fn fs_open_file() -> Result<OpenFileResult, String> {
    // TODO: T09 — use tauri_plugin_dialog to open file picker
    Err("Not yet implemented (T09)".to_string())
}

// T09: Save content to a file path
#[tauri::command]
pub async fn fs_save_file(path: String, content: String) -> Result<(), String> {
    // TODO: T09 — write content to path
    let _ = (path, content);
    Err("Not yet implemented (T09)".to_string())
}

// T09 / T28: Auto-save draft every 30s
#[tauri::command]
pub async fn fs_save_draft(doc_id: String, content: String) -> Result<(), String> {
    // TODO: T28 — write to {app_data_dir}/drafts/{doc_id}.json
    let _ = (doc_id, content);
    Err("Not yet implemented (T28)".to_string())
}

// T09 / T28: List all pending drafts on startup
#[tauri::command]
pub async fn fs_list_drafts() -> Result<Vec<DraftInfo>, String> {
    // TODO: T28 — scan {app_data_dir}/drafts/
    Ok(vec![])
}

// T28: Restore draft content by id
#[tauri::command]
pub async fn fs_restore_draft(draft_id: String) -> Result<String, String> {
    // TODO: T28
    let _ = draft_id;
    Err("Not yet implemented (T28)".to_string())
}

// T28: Delete draft after successful save/close
#[tauri::command]
pub async fn fs_delete_draft(draft_id: String) -> Result<(), String> {
    // TODO: T28
    let _ = draft_id;
    Err("Not yet implemented (T28)".to_string())
}
