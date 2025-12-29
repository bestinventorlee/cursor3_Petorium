module.exports = {
  apps: [{
    name: 'petorium',
    script: 'npm',
    args: 'start',
    cwd: process.cwd(),
    instances: 2, // CPU 코어 수에 맞게 조정 (또는 'max'로 자동)
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false, // 프로덕션에서는 false
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
}

