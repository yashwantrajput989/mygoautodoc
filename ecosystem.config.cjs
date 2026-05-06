module.exports = {
  apps: [
    {
      name: 'docsync-ai',
      script: 'app.js',
      args: 'server',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
      env_production: {
        NODE_ENV: 'production',
      }
    }
  ]
};
