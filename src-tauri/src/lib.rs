// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

/// File system commands for jm-view
/// Full implementation in T09
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::fs_open_file,
            commands::fs_save_file,
            commands::fs_save_draft,
            commands::fs_list_drafts,
            commands::fs_restore_draft,
            commands::fs_delete_draft,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
