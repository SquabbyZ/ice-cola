import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '../interfaces/orchestrator.interface';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 文件读取工具 - 读取指定路径的文件内容
 */
@Injectable()
export class FileReadTool implements Tool {
  private readonly logger = new Logger(FileReadTool.name);
  name = 'file_read';
  description = '读取文件内容';

  async execute(input: any): Promise<any> {
    const filePath = input.path;

    if (!filePath) {
      throw new Error('File path is required');
    }

    // 安全检查：限制在工作目录内
    const workspaceDir = process.env.WORKSPACE_DIR || process.cwd();
    const resolvedPath = path.resolve(workspaceDir, filePath);

    if (!resolvedPath.startsWith(workspaceDir)) {
      throw new Error('Access denied: file path is outside workspace directory');
    }

    try {
      const content = await fs.promises.readFile(resolvedPath, 'utf-8');
      
      return {
        success: true,
        path: resolvedPath,
        content,
        size: content.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to read file ${filePath}: ${error.message}`);
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }
}

/**
 * 文件写入工具 - 写入内容到指定路径的文件
 */
@Injectable()
export class FileWriteTool implements Tool {
  private readonly logger = new Logger(FileWriteTool.name);
  name = 'file_write';
  description = '写入文件内容';

  async execute(input: any): Promise<any> {
    const filePath = input.path;
    const content = input.content;

    if (!filePath || content === undefined) {
      throw new Error('File path and content are required');
    }

    // 安全检查：限制在工作目录内
    const workspaceDir = process.env.WORKSPACE_DIR || process.cwd();
    const resolvedPath = path.resolve(workspaceDir, filePath);

    if (!resolvedPath.startsWith(workspaceDir)) {
      throw new Error('Access denied: file path is outside workspace directory');
    }

    try {
      // 确保目录存在
      const dir = path.dirname(resolvedPath);
      await fs.promises.mkdir(dir, { recursive: true });

      // 写入文件
      await fs.promises.writeFile(resolvedPath, content, 'utf-8');

      return {
        success: true,
        path: resolvedPath,
        size: content.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to write file ${filePath}: ${error.message}`);
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }
}
