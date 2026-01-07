const os = require('os')

function createFallbackCpu() {
  return [
    {
      model: 'unknown',
      speed: 0,
      times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
    },
  ]
}

try {
  const cpus = typeof os.cpus === 'function' ? os.cpus() : null

  if (!Array.isArray(cpus) || cpus.length < 1) {
    const fallback = createFallbackCpu()
    os.cpus = () => fallback
  }
} catch {
  const fallback = createFallbackCpu()
  os.cpus = () => fallback
}

