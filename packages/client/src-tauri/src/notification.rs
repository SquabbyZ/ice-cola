use tauri_plugin_notification::NotificationExt;

/// 发送配额警告通知
#[tauri::command]
pub fn send_quota_warning(app: tauri::AppHandle, utilization: f64, current_cost: f64, budget: f64) {
    let title = "用量警告";
    let body = format!(
        "已使用 {:.0}% 的月度预算 (${:.2} / ${:.2})",
        utilization * 100.0,
        current_cost,
        budget
    );

    app.notification()
        .builder()
        .title(title)
        .body(&body)
        .show()
        .unwrap_or_else(|e| log::error!("Failed to show notification: {}", e));
}

/// 发送配额超限通知
#[tauri::command]
pub fn send_quota_exceeded(app: tauri::AppHandle, budget: f64) {
    let title = "配额已超出";
    let body = format!(
        "月度预算 ${:.2} 已用尽，无法发送新请求",
        budget
    );

    app.notification()
        .builder()
        .title(title)
        .body(&body)
        .show()
        .unwrap_or_else(|e| log::error!("Failed to show notification: {}", e));
}
