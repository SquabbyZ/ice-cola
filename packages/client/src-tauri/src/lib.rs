// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod crypto;
mod database;
mod dialog;
mod gateway;
mod system_tray;
mod notification;

use std::sync::{Arc, Mutex};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // .plugin(tauri_plugin_devtools::init()) // Disabled to test WebSocket issue
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        // 管理 Gateway 进程状态
        .manage(Arc::new(Mutex::new(gateway::GatewayProcess::new(18789))))
        .setup(|app| {
            // 初始化日志（try_init 防止开发模式热重载时重复初始化）
            let _ = env_logger::try_init();
            
            // 初始化数据库
            if let Err(e) = database::initialize_database(app.handle()) {
                eprintln!("Failed to initialize database: {}", e);
            }
            
            // 启动 Gateway (已禁用 - 前端直接连接 NestJS 后端)
            // if let Err(e) = gateway::start_gateway(app.handle()) {
            //     eprintln!("Failed to start Gateway: {}", e);
            // }

            // 设置 Gateway 监控（自动重启）- 已禁用
            // gateway::setup_gateway_monitor(app.handle());
            
            // 设置系统托盘
            if let Err(e) = system_tray::setup_system_tray(app.handle()) {
                eprintln!("Failed to setup system tray: {}", e);
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 加密命令
            crypto::encrypt_api_key,
            crypto::decrypt_api_key,

            // 数据库命令
            database::check_database_health,
            database::export_database,
            database::import_database,

            // Gateway 命令
            gateway::is_gateway_running,
            gateway::get_gateway_port,
            gateway::restart_gateway,

            // 文件对话框命令
            dialog::open_file_dialog,
            dialog::save_file_dialog,
            dialog::open_directory_dialog,

            // 通知命令
            notification::send_quota_warning,
            notification::send_quota_exceeded,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api: _, .. } = event {
                // 关闭窗口时停止 Gateway (已禁用)
                // let app = window.app_handle();
                // if let Err(e) = gateway::stop_gateway(app) {
                //     eprintln!("Failed to stop Gateway: {}", e);
                // }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
