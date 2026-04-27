#!/usr/bin/env node
/**
 * Mock Gateway for testing Tauri Sidecar integration
 * This simulates the real Gateway behavior without requiring full build
 */

const http = require('http');
const WebSocket = require('ws');

const port = process.argv[2] || 18789;
const bind = process.argv[3] || 'loopback';

console.log(`[Mock Gateway] Starting on port ${port} (bind: ${bind})`);

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('[Mock Gateway] Client connected');
  
  ws.on('message', (message) => {
    try {
      const request = JSON.parse(message.toString());
      console.log('[Mock Gateway] Received:', request);
      
      // 模拟真实的 RPC 方法
      let response;
      
      switch (request.method) {
        case 'chat.history':
          response = {
            id: request.id,
            jsonrpc: '2.0',
            result: {
              messages: [
                { id: '1', role: 'user', content: '你好！', timestamp: new Date().toISOString() },
                { id: '2', role: 'assistant', content: '你好！我是 OpenClaw AI 助手。有什么我可以帮你的吗？', timestamp: new Date().toISOString() }
              ],
              total: 2
            }
          };
          break;
          
        case 'chat.send':
          response = {
            id: request.id,
            jsonrpc: '2.0',
            result: {
              message: {
                id: String(Date.now()),
                role: 'assistant',
                content: `收到你的消息："${request.params?.content}"。这是一个模拟回复。`,
                timestamp: new Date().toISOString()
              }
            }
          };
          break;
          
        case 'experts.list':
          response = {
            id: request.id,
            jsonrpc: '2.0',
            result: {
              experts: [
                { id: 'code-reviewer', name: '代码审查专家', calls: 42, status: 'active' },
                { id: 'data-analyst', name: '数据分析师', calls: 28, status: 'active' },
                { id: 'security-auditor', name: '安全审计员', calls: 15, status: 'idle' }
              ],
              total: 3
            }
          };
          break;
          
        case 'tools.list':
          response = {
            id: request.id,
            jsonrpc: '2.0',
            result: {
              tools: [
                { id: 'web-search', name: '网页搜索', enabled: true },
                { id: 'file-read', name: '文件读取', enabled: true },
                { id: 'code-exec', name: '代码执行', enabled: false }
              ],
              total: 3
            }
          };
          break;
          
        case 'stats.get':
          response = {
            id: request.id,
            jsonrpc: '2.0',
            result: {
              totalMessages: 156,
              activeExperts: 2,
              uptime: '2h 15m',
              memoryUsage: '45 MB'
            }
          };
          break;

        case 'usage.status':
          response = {
            id: request.id,
            jsonrpc: '2.0',
            result: {
              period: request.params?.period || 'month',
              totalCost: 125.50,
              totalTokens: 45200,
              requestCount: 89,
              breakdown: [
                { model: 'claude-opus-4-7', cost: 75.30, tokens: 28000 },
                { model: 'claude-sonnet-4-6', cost: 50.20, tokens: 17200 }
              ]
            }
          };
          break;

        case 'quota.getConfig':
          response = {
            id: request.id,
            jsonrpc: '2.0',
            result: {
              monthlyBudget: 200,
              warningThreshold: 0.8,
              hardLimit: true
            }
          };
          break;

        case 'experts.list':
          response = {
            id: request.id,
            jsonrpc: '2.0',
            result: {
              experts: [
                { id: 'code-reviewer', name: '代码审查专家', calls: 42, status: 'active' },
                { id: 'data-analyst', name: '数据分析师', calls: 28, status: 'active' },
                { id: 'security-auditor', name: '安全审计员', calls: 15, status: 'idle' }
              ],
              total: 3
            }
          };
          break;

        default:
          response = {
            id: request.id,
            jsonrpc: '2.0',
            result: { message: 'Mock Gateway received your message', method: request.method }
          };
      }
      
      ws.send(JSON.stringify(response));
      console.log('[Mock Gateway] Sent:', response);
    } catch (error) {
      console.error('[Mock Gateway] Error:', error);
      ws.send(JSON.stringify({
        id: null,
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error' }
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('[Mock Gateway] Client disconnected');
  });
});

server.listen(port, bind === 'loopback' ? '127.0.0.1' : '0.0.0.0', () => {
  console.log(`[Mock Gateway] ✅ Ready on ws://127.0.0.1:${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Mock Gateway] Received SIGTERM, shutting down...');
  wss.close();
  server.close(() => {
    console.log('[Mock Gateway] Stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Mock Gateway] Received SIGINT, shutting down...');
  wss.close();
  server.close(() => {
    console.log('[Mock Gateway] Stopped');
    process.exit(0);
  });
});
