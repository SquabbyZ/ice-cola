use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// 获取数据库路径
fn get_db_path(app: &AppHandle) -> PathBuf {
    let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
    app_dir.join("openclaw.db")
}

/// 初始化数据库（创建表）
pub fn initialize_database(app: &AppHandle) -> Result<(), String> {
    let db_path = get_db_path(app);
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // 启用外键支持
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    // 创建用户表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            auth_type TEXT NOT NULL DEFAULT 'local',
            external_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create users table: {}", e))?;

    // 创建会话表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create sessions table: {}", e))?;

    // 创建对话表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES sessions(id),
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create conversations table: {}", e))?;

    // 创建消息表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL REFERENCES conversations(id),
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'toolresult')),
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            run_id TEXT,
            status TEXT CHECK(status IN ('sending', 'streaming', 'complete', 'error'))
        )",
        [],
    ).map_err(|e| format!("Failed to create messages table: {}", e))?;

    // 创建用量记录表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS usage_records (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            session_id TEXT NOT NULL REFERENCES sessions(id),
            conversation_id TEXT NOT NULL REFERENCES conversations(id),
            message_id TEXT NOT NULL REFERENCES messages(id),
            model TEXT NOT NULL,
            input_tokens INTEGER NOT NULL,
            output_tokens INTEGER NOT NULL,
            cost REAL NOT NULL,
            timestamp TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create usage_records table: {}", e))?;

    // 创建 API Keys 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            provider TEXT NOT NULL,
            encrypted_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_used_at TEXT
        )",
        [],
    ).map_err(|e| format!("Failed to create api_keys table: {}", e))?;

    // 创建专家 Prompt 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS expert_prompts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            name TEXT NOT NULL,
            description TEXT,
            system_prompt TEXT NOT NULL,
            icon TEXT,
            color TEXT,
            is_default BOOLEAN NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create expert_prompts table: {}", e))?;

    // 创建索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
        [],
    ).map_err(|e| format!("Failed to create index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id)",
        [],
    ).map_err(|e| format!("Failed to create index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)",
        [],
    ).map_err(|e| format!("Failed to create index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_usage_records_user_id_timestamp ON usage_records(user_id, timestamp)",
        [],
    ).map_err(|e| format!("Failed to create index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_api_keys_user_id_provider ON api_keys(user_id, provider)",
        [],
    ).map_err(|e| format!("Failed to create index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_expert_prompts_user_id ON expert_prompts(user_id)",
        [],
    ).map_err(|e| format!("Failed to create index: {}", e))?;

    log::info!("Database initialized at: {:?}", db_path);
    Ok(())
}

/// 获取数据库连接
pub fn get_connection(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app);
    Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))
}

/// 数据库健康检查
#[tauri::command]
pub fn check_database_health(app: AppHandle) -> Result<bool, String> {
    let conn = get_connection(&app)?;
    
    // 尝试查询一个表
    let result: Result<i64, _> = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
        [],
        |row| row.get(0),
    );
    
    match result {
        Ok(count) => {
            log::info!("Database health check passed. Tables: {}", count);
            Ok(true)
        }
        Err(e) => {
            log::error!("Database health check failed: {}", e);
            Err(format!("Database health check failed: {}", e))
        }
    }
}

/// 导出数据库（备份）
#[tauri::command]
pub fn export_database(app: AppHandle, dest_path: String) -> Result<(), String> {
    use std::fs;
    
    let db_path = get_db_path(&app);
    
    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }
    
    fs::copy(&db_path, &dest_path)
        .map_err(|e| format!("Failed to copy database: {}", e))?;
    
    log::info!("Database exported to: {}", dest_path);
    Ok(())
}

/// 导入数据库（恢复）
#[tauri::command]
pub fn import_database(app: AppHandle, source_path: String) -> Result<(), String> {
    use std::fs;
    
    let db_path = get_db_path(&app);
    
    if !std::path::Path::new(&source_path).exists() {
        return Err("Source file not found".to_string());
    }
    
    // 备份当前数据库
    if db_path.exists() {
        let backup_path = format!("{}.backup", db_path.display());
        fs::copy(&db_path, &backup_path)
            .map_err(|e| format!("Failed to backup current database: {}", e))?;
    }
    
    // 导入新数据库
    fs::copy(&source_path, &db_path)
        .map_err(|e| format!("Failed to import database: {}", e))?;
    
    log::info!("Database imported from: {}", source_path);
    Ok(())
}
