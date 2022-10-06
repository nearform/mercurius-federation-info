import pino from 'pino'

export default options => {
  return pino(
    {
      name: 'mercurius-federation-sample',
      level: options.level || 'info',
      formatters: {
        level(label) {
          return { level: label.toUpperCase() }
        }
      }
    },
    pino.destination({ sync: false })
  )
}
