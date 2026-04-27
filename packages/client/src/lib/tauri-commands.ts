/**
 * Tauri 命令封装
 * 
 * 提供前端调用 Rust 原生能力的统一接口
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// ==================== Gateway 管理 ====================

/**
 * 检查 Gateway 是否正在运行
 */
export async function isGatewayRunning(): Promise<boolean> {
  try {
    return await invoke<boolean>('is_gateway_running');
  } catch (error) {
    console.error('Failed to check Gateway status:', error);
    return false;
  }
}

/**
 * 获取 Gateway 端口
 */
export async function getGatewayPort(): Promise<number> {
  try {
    return await invoke<number>('get_gateway_port');
  } catch (error) {
    console.error('Failed to get Gateway port:', error);
    return 18789; // 默认端口
  }
}

/**
 * 监听 Gateway 就绪事件
 * 
 * @param callback - Gateway 就绪时的回调函数，参数为端口号
 * @returns 取消监听的函数
 */
export async function onGatewayReady(
  callback: (port: number) => void
): Promise<UnlistenFn> {
  return await listen<number>('gateway-ready', (event) => {
    console.log('Gateway is ready on port:', event.payload);
    callback(event.payload);
  });
}

/**
 * 监听 Gateway 启动失败事件
 * 
 * @param callback - Gateway 启动失败时的回调函数
 * @returns 取消监听的函数
 */
export async function onGatewayStartFailed(
  callback: (error?: string) => void
): Promise<UnlistenFn> {
  return await listen<string>('gateway-start-failed', (event) => {
    console.error('Gateway failed to start:', event.payload);
    callback(event.payload);
  });
}

// ==================== 加密功能（预留） ====================

/**
 * 加密 API Key
 * 
 * @param plainText - 明文 API Key
 * @returns 加密后的字符串
 */
export async function encryptApiKey(plainText: string): Promise<string> {
  return await invoke<string>('encrypt_api_key', { plainText });
}

/**
 * 解密 API Key
 * 
 * @param encryptedText - 加密后的字符串
 * @returns 明文 API Key
 */
export async function decryptApiKey(encryptedText: string): Promise<string> {
  return await invoke<string>('decrypt_api_key', { encryptedText });
}

// ==================== 数据库管理（预留） ====================

/**
 * 检查数据库健康状态
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  return await invoke<boolean>('check_database_health');
}

/**
 * 导出数据库
 * 
 * @param destPath - 目标文件路径
 */
export async function exportDatabase(destPath: string): Promise<void> {
  return await invoke<void>('export_database', { destPath });
}

/**
 * 导入数据库
 * 
 * @param sourcePath - 源文件路径
 */
export async function importDatabase(sourcePath: string): Promise<void> {
  return await invoke<void>('import_database', { sourcePath });
}

// ==================== 系统通知（预留） ====================

/**
 * 发送配额警告通知
 * 
 * @param utilization - 用量百分比（0-1）
 * @param currentCost - 当前费用
 * @param budget - 预算上限
 */
export async function sendQuotaWarning(
  utilization: number,
  currentCost: number,
  budget: number
): Promise<void> {
  return await invoke<void>('send_quota_warning', {
    utilization,
    currentCost,
    budget,
  });
}

/**
 * 发送配额超限通知
 * 
 * @param budget - 预算上限
 */
export async function sendQuotaExceeded(budget: number): Promise<void> {
  return await invoke<void>('send_quota_exceeded', { budget });
}

// ==================== 文件对话框 ====================

/**
 * 打开文件选择对话框
 *
 * @param filters - 文件过滤器（如 ['*.json', '*.txt']）
 * @returns 选中的文件路径，取消则返回 null
 */
export async function openFileDialog(filters?: string[]): Promise<string | null> {
  return await invoke<string | null>('open_file_dialog', {
    filters: filters || [],
  });
}

/**
 * 保存文件对话框
 *
 * @param defaultName - 默认文件名
 * @returns 保存的文件路径，取消则返回 null
 */
export async function saveFileDialog(defaultName: string): Promise<string | null> {
  return await invoke<string | null>('save_file_dialog', { defaultName });
}

/**
 * 打开文件夹选择对话框
 *
 * @returns 选中的文件夹路径，取消则返回 null
 */
export async function openDirectoryDialog(): Promise<string | null> {
  return await invoke<string | null>('open_directory_dialog');
}
