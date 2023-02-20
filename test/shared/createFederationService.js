import Fastify from 'fastify'
import { mercuriusFederationPlugin } from '@mercuriusjs/federation'

export default async function createFederationService(schema, resolvers) {
  const app = Fastify()
  app.register(mercuriusFederationPlugin, {
    schema,
    resolvers
  })

  app.post('/', async function () {
    const query = '{ _service { sdl } }'
    return app.graphql(query)
  })

  await app.listen({ port: 0 })
  return [app, app.server.address().port]
}
