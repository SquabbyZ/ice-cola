/**
 * 工具类型枚举
 */
export enum ToolType {
  MCP_SERVER = 'mcp_server',      // MCP 服务器工具
  OPENCLAW_TOOL = 'openclaw_tool', // OpenClaw 内置工具
  CUSTOM = 'custom',              // 自定义工具
}

/**
 * 工具状态枚举
 */
export enum ToolStatus {
  ACTIVE = 'active',        // 激活
  INACTIVE = 'inactive',    // 停用
  ERROR = 'error',         // 错误状态
}

/**
 * 工具接口定义
 */
export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  type: ToolType;
  status: ToolStatus;
  
  // MCP 相关配置
  mcpConfig?: {
    command?: string;
    args?: string[];
    url?: string;
    transport?: 'stdio' | 'sse' | 'http';
    env?: Record<string, string>;
  };
  
  // OpenClaw 工具配置
  openclawConfig?: {
    module?: string;
    function?: string;
    permissions?: string[];
  };
  
  // 通用配置
  metadata?: {
    version?: string;
    author?: string;
    tags?: string[];
    category?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 工具注册请求 DTO
 */
export interface RegisterToolDto {
  name: string;
  description: string;
  type: ToolType;
  
  mcpConfig?: {
    command?: string;
    args?: string[];
    url?: string;
    transport?: 'stdio' | 'sse' | 'http';
    env?: Record<string, string>;
  };
  
  openclawConfig?: {
    module?: string;
    function?: string;
    permissions?: string[];
  };
  
  metadata?: {
    version?: string;
    author?: string;
    tags?: string[];
    category?: string;
  };
}

/**
 * 工具更新请求 DTO
 */
export interface UpdateToolDto {
  name?: string;
  description?: string;
  status?: ToolStatus;
  
  mcpConfig?: {
    command?: string;
    args?: string[];
    url?: string;
    transport?: 'stdio' | 'sse' | 'http';
    env?: Record<string, string>;
  };
  
  openclawConfig?: {
    module?: string;
    function?: string;
    permissions?: string[];
  };
  
  metadata?: {
    version?: string;
    author?: string;
    tags?: string[];
    category?: string;
  };
}

/**
 * 工具查询参数
 */
export interface QueryToolsDto {
  type?: ToolType;
  status?: ToolStatus;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
