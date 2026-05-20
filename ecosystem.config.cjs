module.exports = {
  apps: [
    {
      name: 'ice-cola-admin-1992',
      cwd: './packages/admin',
      script: 'node_modules/vite/bin/vite.js',
      args: '--host 0.0.0.0 --port 1992 --strictPort',
      interpreter: 'C:/Program Files/nodejs/node.exe',
      env: { NODE_ENV: 'development' },
    },
    {
      name: 'ice-cola-client-1420',
      cwd: './packages/client',
      script: 'node_modules/vite/bin/vite.js',
      args: '--host 0.0.0.0 --port 1420 --strictPort',
      interpreter: 'C:/Program Files/nodejs/node.exe',
      env: { NODE_ENV: 'development' },
    },
  ],
};
