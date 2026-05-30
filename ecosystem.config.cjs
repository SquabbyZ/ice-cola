module.exports = {
  apps: [
    {
      name: 'ice-cola-admin-1992',
      cwd: './packages/admin',
      script: 'npx',
      args: 'vite --port 1992',
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'ice-cola-client-1420',
      cwd: './packages/client',
      script: 'npx',
      args: 'vite --port 1420',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
