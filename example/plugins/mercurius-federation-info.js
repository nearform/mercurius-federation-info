import fp from 'fastify-plugin'

export default fp(
  async fastify => {
    fastify.register(import('../../index.js'), {})
  },
  {
    name: 'mercurius-federation-info',
    dependencies: ['mercurius']
  }
)
