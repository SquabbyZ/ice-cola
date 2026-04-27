use tauri_plugin_dialog::DialogExt;

/// 打开文件选择对话框
#[tauri::command]
pub fn open_file_dialog(
    app: tauri::AppHandle,
    _filters: Vec<String>,
) -> Result<Option<String>, String> {
    let file_path = app.dialog()
        .file()
        .add_filter("All Files", &["*"])
        .blocking_pick_file();

    match file_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

/// 保存文件对话框
#[tauri::command]
pub fn save_file_dialog(
    app: tauri::AppHandle,
    default_name: String,
) -> Result<Option<String>, String> {
    let file_path = app.dialog()
        .file()
        .set_file_name(&default_name)
        .blocking_save_file();

    match file_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

/// 打开文件夹选择对话框
#[tauri::command]
pub fn open_directory_dialog(
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    let path = app.dialog()
        .file()
        .blocking_pick_folder();

    match path {
        Some(p) => Ok(Some(p.to_string())),
        None => Ok(None),
    }
}