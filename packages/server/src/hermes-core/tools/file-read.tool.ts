import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '../interfaces/orchestrator.interface';

/**
 * File Read 工具 - 读取文件内容
 * 注意：在 Server 端实现中，这只是一个占位符
 * 实际的文件读取应该通过 Tauri RPC 在客户端执行
 */
@Injectable()
export class FileReadTool implements Tool {
  private readonly logger = new Logger(FileReadTool.name);
  name = 'file_read';
  description = '读取文件内容（需要客户端支持）';

  async execute(input: any): Promise<any> {
    const { path } = input;

    this.logger.warn(`File read requested for: ${path}`);
    this.logger.warn('Note: File operations should be executed on the client side via Tauri RPC');

    // 在 Server 端，我们返回一个提示，告诉客户端需要执行文件读取
    return {
      success: false,
      message: '文件读取需要在客户端执行',
      action: 'tauri_rpc',
      command: 'read_file',
      params: { path },
      note: '此操作应通过 OpenClaw Client 的 Tauri RPC 执行',
    };
  }
}
