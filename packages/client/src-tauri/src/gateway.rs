use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager, Emitter};
use log::{info, error, warn};

/// Gateway 进程状态
pub struct GatewayProcess {
    pub child: Option<Child>,
    pub port: u16,
    pub is_running: bool,
}

impl GatewayProcess {
    pub fn new(port: u16) -> Self {
        Self {
            child: None,
            port,
            is_running: false,
        }
    }
}

/// 启动 Gateway 子进程
pub fn start_gateway(app: &AppHandle) -> Result<(), String> {
    let gateway_state = app.state::<Arc<Mutex<GatewayProcess>>>();
    let mut state = gateway_state.lock().unwrap();
    
    if state.is_running {
        warn!("Gateway is already running");
        return Ok(());
    }
    
    // 使用Node.js运行peaksclaw的Gateway
    // 当前目录是 openclaw-desktop/tauri-app/src-tauri
    // Tauri dev命令在src-tauri目录下运行
    let current_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current dir: {}", e))?;
    
    // 计算peaksclaw目录路径: src-tauri -> tauri-app -> openclaw-desktop -> peaksclaw
    let tauri_app_dir = current_dir.parent()
        .ok_or_else(|| "Failed to get tauri-app directory".to_string())?;
    
    let openclaw_desktop_dir = tauri_app_dir.parent()
        .ok_or_else(|| "Failed to get openclaw-desktop directory".to_string())?;
    
    let peaksclaw_dir = openclaw_desktop_dir.parent()
        .ok_or_else(|| "Failed to get workspace directory".to_string())?;
    
    let peaksclaw_canonical = peaksclaw_dir.join("peaksclaw").canonicalize()
        .map_err(|e| format!("Failed to resolve peaksclaw path: {}", e))?;
    
    let config_path = peaksclaw_canonical.join("openclaw.json");
    info!("Config path: {:?}", config_path);
    info!("Config file exists: {}", config_path.exists());
    
    let run_script = peaksclaw_canonical.join("scripts/run-node.mjs");
    
    info!("Starting Gateway from: {:?}", run_script);
    info!("peaksclaw directory: {:?}", peaksclaw_canonical);
    
    // 检查文件是否存在
    if !run_script.exists() {
        error!("Gateway script not found at: {:?}", run_script);
        return Err(format!("Gateway script not found: {:?}", run_script));
    }
    
    // 启动 Gateway 作为子进程
    // 命令: node scripts/run-node.mjs gateway --bind loopback --port 18789 --allow-unconfigured
    let child = Command::new("node")
        .current_dir(&peaksclaw_canonical)
        .args(&[
            "scripts/run-node.mjs",
            "gateway",
            "--bind", "loopback",
            "--port", &state.port.to_string(),
            "--allow-unconfigured",  // 允许在没有配置的情况下启动(开发模式)
        ])
        .env("OPENCLAW_SKIP_CHANNELS", "1")
        .env("OPENCLAW_CONFIG_PATH", config_path.to_str().unwrap())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Gateway: {}", e))?;
    
    state.child = Some(child);
    state.is_running = true;
    
    info!("Gateway started on port {}", state.port);
    
    // 等待 Gateway 就绪（最多 10 秒）
    thread::spawn({
        let app_handle = app.clone();
        let port = state.port;
        move || {
            wait_for_gateway_ready(port, &app_handle);
        }
    });
    
    Ok(())
}

/// 停止 Gateway 子进程
pub fn stop_gateway(app: &AppHandle) -> Result<(), String> {
    let gateway_state = app.state::<Arc<Mutex<GatewayProcess>>>();
    let mut state = gateway_state.lock().unwrap();
    
    if !state.is_running {
        warn!("Gateway is not running");
        return Ok(());
    }
    
    if let Some(mut child) = state.child.take() {
        info!("Stopping Gateway...");
        
        // Windows 上直接终止
        #[cfg(windows)]
        {
            let _ = child.kill();
            // Windows 上简单等待
            let _ = child.wait();
        }
        
        // Unix 系统发送 SIGTERM
        #[cfg(unix)]
        {
            use nix::sys::signal::{kill, Signal};
            use nix::unistd::Pid;
            
            let pid = child.id() as i32;
            if let Err(e) = kill(Pid::from_raw(pid), Signal::SIGTERM) {
                warn!("Failed to send SIGTERM: {}", e);
            }
            
            // 等待进程退出（最多 5 秒）
            match child.wait_timeout(Duration::from_secs(5)) {
                Ok(Some(_)) => info!("Gateway stopped gracefully"),
                Ok(None) => {
                    warn!("Gateway did not stop in time, forcing termination");
                    let _ = child.kill();
                }
                Err(e) => error!("Error waiting for Gateway: {}", e),
            }
        }
    }
    
    state.is_running = false;
    info!("Gateway stopped");
    
    Ok(())
}

/// 重启 Gateway
#[tauri::command]
pub fn restart_gateway(app: AppHandle) -> Result<(), String> {
    info!("Restarting Gateway...");
    stop_gateway(&app)?;
    thread::sleep(Duration::from_secs(1));
    start_gateway(&app)?;
    Ok(())
}

/// 检查 Gateway 是否正在运行
#[tauri::command]
pub fn is_gateway_running(app: AppHandle) -> Result<bool, String> {
    let gateway_state = app.state::<Arc<Mutex<GatewayProcess>>>();
    let state = gateway_state.lock().unwrap();
    Ok(state.is_running)
}

/// 获取 Gateway 端口
#[tauri::command]
pub fn get_gateway_port(app: AppHandle) -> Result<u16, String> {
    let gateway_state = app.state::<Arc<Mutex<GatewayProcess>>>();
    let state = gateway_state.lock().unwrap();
    Ok(state.port)
}

/// 等待 Gateway 就绪
fn wait_for_gateway_ready(port: u16, app: &AppHandle) {
    let max_retries = 40; // 最多等待 20 秒（每次 0.5 秒）
    let mut retries = 0;
    
    info!("Waiting for Gateway to be ready on port {}...", port);
    
    loop {
        if retries >= max_retries {
            error!("Gateway failed to start within timeout ({} seconds)", max_retries / 2);
            
            // 发送通知给用户
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.emit("gateway-start-failed", "");
            }
            
            return;
        }
        
        // 尝试连接 WebSocket
        if check_gateway_health(port) {
            info!("Gateway is ready after {} seconds!", retries / 2);
            
            // 发送就绪事件给前端
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.emit("gateway-ready", port);
            }
            
            return;
        }
        
        retries += 1;
        if retries % 4 == 0 {  // 每 2 秒打印一次日志
            info!("Still waiting for Gateway... ({}/{} seconds)", retries / 2, max_retries / 2);
        }
        thread::sleep(Duration::from_millis(500));
    }
}

/// 检查 Gateway 健康状态
fn check_gateway_health(port: u16) -> bool {
    use std::net::TcpStream;
    
    let address = format!("127.0.0.1:{}", port);
    TcpStream::connect(&address).is_ok()
}

/// 自动重启失败的 Gateway
pub fn setup_gateway_monitor(app: &AppHandle) {
    let app_handle = app.clone();
    
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_secs(5));
            
            let gateway_state = app_handle.state::<Arc<Mutex<GatewayProcess>>>();
            let state = gateway_state.lock().unwrap();
            
            if state.is_running {
                // 检查子进程是否还在运行
                if let Some(ref _child) = state.child {
                    // 注意：这里需要更复杂的逻辑来检测进程状态
                    // 简化版本：假设如果 is_running=true，就认为还在运行
                }
            }
        }
    });
}
