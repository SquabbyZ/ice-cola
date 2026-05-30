#!/usr/bin/env node
/**
 * Cross-platform dev server manager for Ice Cola.
 *
 * Usage:
 *   node dev.mjs          Start all dev servers (admin, client, server)
 *   node dev.mjs stop     Stop all dev servers
 *   node dev.mjs status   Check which servers are running
 */

import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

const SERVERS = {
  server: {
    name: 'Server (NestJS)',
    port: 3000,
    cmd: 'pnpm',
    args: ['--filter', '@ice-cola/server', 'dev'],
    cwd: ROOT,
  },
  admin: {
    name: 'Admin (Vite)',
    port: 1992,
    cmd: 'pnpm',
    args: ['--filter', 'openclaw-admin', 'dev'],
    cwd: ROOT,
  },
  client: {
    name: 'Client (Vite)',
    port: 1420,
    cmd: 'pnpm',
    args: ['--filter', 'openclaw-desktop', 'dev'],
    cwd: ROOT,
  },
};

const processes = {};

function log(tag, msg) {
  const prefix = { server: '\x1b[33m[srv]\x1b[0m', admin: '\x1b[32m[adm]\x1b[0m', client: '\x1b[36m[cli]\x1b[0m' }[tag] || `[${tag}]`;
  console.log(`${prefix} ${msg}`);
}

function startServer(key) {
  const cfg = SERVERS[key];
  const child = spawn(cfg.cmd, cfg.args, {
    cwd: cfg.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  processes[key] = child;

  child.stdout?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      log(key, line);
    }
  });

  child.stderr?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      log(key, line);
    }
  });

  child.on('exit', (code) => {
    log(key, `exited with code ${code}`);
    delete processes[key];
  });

  log(key, `starting ${cfg.name} on :${cfg.port}...`);
}

function stopAll() {
  for (const [key, cfg] of Object.entries(SERVERS)) {
    try {
      if (process.platform === 'win32') {
        // Windows: find and kill processes on the port
        const result = execSync(`netstat -ano | findstr :${cfg.port} | findstr LISTENING`, { encoding: 'utf-8', stdio: 'pipe' });
        const pids = result.split('\n').filter(Boolean).map((line) => line.trim().split(/\s+/).pop()).filter(Boolean);
        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
            log(key, `killed PID ${pid} on port :${cfg.port}`);
          } catch { /* process already gone */ }
        }
      } else {
        execSync(`lsof -ti:${cfg.port} | xargs kill -9 2>/dev/null || true`, { stdio: 'pipe' });
        log(key, `killed processes on port :${cfg.port}`);
      }
    } catch {
      log(key, `no process found on port :${cfg.port}`);
    }
  }
}

function checkStatus() {
  console.log('\n  Ice Cola Dev Server Status\n  ─────────────────────────');
  for (const [key, cfg] of Object.entries(SERVERS)) {
    let running = false;
    try {
      if (process.platform === 'win32') {
        execSync(`netstat -ano | findstr :${cfg.port} | findstr LISTENING`, { stdio: 'pipe' });
      } else {
        execSync(`lsof -ti:${cfg.port}`, { stdio: 'pipe' });
      }
      running = true;
    } catch { /* not listening */ }
    const status = running ? '\x1b[32mRUNNING\x1b[0m' : '\x1b[31mSTOPPED\x1b[0m';
    console.log(`  ${cfg.name.padEnd(20)} :${cfg.port}  ${status}`);
  }
  console.log('');
}

function printBanner() {
  console.log(`
\x1b[1m  Ice Cola Dev Servers\x1b[0m
  ──────────────────────
  Admin:   http://localhost:1992
  Client:  http://localhost:1420
  Server:  http://localhost:3000

  Press Ctrl+C to stop all servers
`);
}

function shutdown() {
  console.log('\n  Shutting down...');
  for (const [key, child] of Object.entries(processes)) {
    child.kill('SIGTERM');
    log(key, 'stopped');
  }
  process.exit(0);
}

// Main
const cmd = process.argv[2];

if (cmd === 'stop') {
  stopAll();
  process.exit(0);
}

if (cmd === 'status') {
  checkStatus();
  process.exit(0);
}

// Check if server .env exists
if (!existsSync(resolve(ROOT, 'packages/server/.env'))) {
  console.warn('\x1b[33m⚠ packages/server/.env not found. Copy .env.example or create one.\x1b[0m');
}

// Start all servers
printBanner();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer('server');
startServer('admin');
startServer('client');
