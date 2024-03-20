// Cleanup after testing specific debug version
const { spawnSync } = require('child_process')
spawnSync('npm', ['i'], { stdio: 'ignore' })
