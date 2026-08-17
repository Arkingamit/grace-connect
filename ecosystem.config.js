module.exports = { apps: [{ name: 'grace-connect', script: 'node_modules/next/dist/bin/next', args: 'start -p 4000', instances: 'max', exec_mode: 'cluster', env: { NODE_ENV: 'production' } }] };
