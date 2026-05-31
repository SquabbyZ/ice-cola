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
    {
      name: 'ice-cola-hermes-9119',
      cwd: './packages/hermes-agent',
      script: 'python',
      args: '-m hermes_cli.main web --port 9119',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
