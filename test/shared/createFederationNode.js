import Fastify from 'fastify'
import mercurius from 'mercurius'

export async function createNode(schema, resolvers) {
  const app = Fastify()
  app.register(mercurius, {
    schema,
    resolvers,
    federationMetadata: true
  })

  app.post('/', async function () {
    const query = '{ _service { sdl } }'
    return app.graphql(query)
  })

  await app.listen({ port: 0 })
  return [app, app.server.address().port]
}
