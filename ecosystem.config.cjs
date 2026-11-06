
module.exports = {
  apps: [
    {
      name: "merat",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      max_memory_restart: "1G",
      time: true,
      out_file: "logs/merat-out.log",
      error_file: "logs/merat-error.log",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
      }
    },
    {
      name: "merat-socket",
      cwd: __dirname,
      script: "socket-server.cjs",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      max_memory_restart: "512M",
      time: true,
      out_file: "logs/merat-socket-out.log",
      error_file: "logs/merat-socket-error.log",
      env: {
        NODE_ENV: "production",
        SOCKET_PORT: "3001"
      }
    }
  ]
};
