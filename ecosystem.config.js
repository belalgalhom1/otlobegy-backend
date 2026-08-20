module.exports = {
  apps: [
    {
      name: 'api',
      script: 'dist/src/api.js',
      exec_mode: 'cluster',
      instances: 'max',
      watch: false,
      autorestart: true,
      max_memory_restart: '600M',
    },
    {
      name: 'ws',
      script: 'dist/src/ws.js',
      exec_mode: 'cluster',
      instances: 'max',
      watch: false,
      autorestart: true,
      max_memory_restart: '800M',
    },
    {
      name: 'worker',
      script: 'dist/src/worker.js',
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      autorestart: true,
      max_memory_restart: '1G',
    },
  ],
};