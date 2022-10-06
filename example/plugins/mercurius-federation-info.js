import fp from 'fastify-plugin'

export default fp(
  async fastify => {
    fastify.register(import('../../lib/index.js'), {})
  },
  {
    name: 'mercurius-federation-info',
    dependencies: ['mercurius']
  }
)
