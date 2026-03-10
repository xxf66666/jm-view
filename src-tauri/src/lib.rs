mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // T13: 文件操作
            commands::fs_open_file,
            commands::fs_save_file,
            commands::fs_save_file_as,
            // T16: 草稿自动保存 / 崩溃恢复
            commands::fs_save_draft,
            commands::fs_list_drafts,
            commands::fs_restore_draft,
            commands::fs_delete_draft,
            commands::get_startup_file,
            commands::fs_read_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
