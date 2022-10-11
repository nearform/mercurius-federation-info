import Fastify from 'fastify'
import mercurius from 'mercurius'
import { test } from 'tap'
import { createNodeOne, createNodeTwo } from './shared/createFederationNode.js'

test('return explain value', async t => {
  const app = Fastify()
  const [nodeOne, nodeOnePort] = await createNodeOne()
  const [nodeTwo, nodeTwoPort] = await createNodeTwo()

  t.teardown(async () => {
    await app.close()
    await nodeOne.close()
    await nodeTwo.close()
  })

  app.register(mercurius, {
    gateway: {
      services: [
        {
          name: 'user',
          url: `http://localhost:${nodeOnePort}`
        },
        {
          name: 'post',
          url: `http://localhost:${nodeTwoPort}`
        }
      ]
    }
  })
  app.register(import('../lib/index.js'), {})

  const res = await app.inject({
    method: 'GET',
    url: '/federation-schema'
  })
  console.log(res.json())
  t.equal(res.statusCode, 200)
})
