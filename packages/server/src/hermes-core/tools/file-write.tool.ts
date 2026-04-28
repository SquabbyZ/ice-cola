import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '../interfaces/orchestrator.interface';

/**
 * File Write 工具 - 写入文件内容
 * 注意：在 Server 端实现中，这只是一个占位符
 * 实际的文件写入应该通过 Tauri RPC 在客户端执行
 */
@Injectable()
export class FileWriteTool implements Tool {
  private readonly logger = new Logger(FileWriteTool.name);
  name = 'file_write';
  description = '写入文件内容（需要客户端支持）';

  async execute(input: any): Promise<any> {
    const { path, content } = input;

    this.logger.warn(`File write requested for: ${path}`);
    this.logger.warn('Note: File operations should be executed on the client side via Tauri RPC');

    // 在 Server 端，我们返回一个提示，告诉客户端需要执行文件写入
    return {
      success: false,
      message: '文件写入需要在客户端执行',
      action: 'tauri_rpc',
      command: 'write_file',
      params: { path, content },
      note: '此操作应通过 OpenClaw Client 的 Tauri RPC 执行',
    };
  }
}
