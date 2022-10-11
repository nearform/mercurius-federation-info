import Fastify from 'fastify'
import mercurius from 'mercurius'
import { test } from 'tap'
import { createNode } from './shared/createFederationNode.js'

test('return explain value', async t => {
  const app = Fastify()

  const schemaAlt = `
  type Query {
    me: User
  }
    type User {
      id: ID!
      name: String!
      fullName: String
    }`

  const schema = `
  type Query {
    customer: Customer
  }
  type Customer{
    age: Int!
  }`

  const [nodeOne, nodeOnePort] = await createNode(schema)
  const [nodeTwo, nodeTwoPort] = await createNode(schemaAlt)

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
  app.register(import('../index.js'), {})

  const res = await app.inject({
    method: 'GET',
    url: '/federation-schema'
  })
  t.equal(res.statusCode, 200)
})

test('directives are included in the info', async t => {
  const app = Fastify()

  const schemaAlt = `
    #graphql
    type User @key(fields: "id") {
      id: ID!
      name: String!
      fullName: String!
      friends: [User]
    }`

  const schema = `
  #graphql
  type Query {
    me: User
  }

  type User @key(fields: "id") @extends {
    numberOfPosts: Int
  }`

  const [nodeOne, nodeOnePort] = await createNode(schema)
  const [nodeTwo, nodeTwoPort] = await createNode(schemaAlt)

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
  app.register(import('../index.js'), {})

  const res = await app.inject({
    method: 'GET',
    url: '/federation-schema'
  })
  t.equal(res.statusCode, 200)
})

test('field directives are included in the info', async t => {
  const app = Fastify()

  const schemaAlt = `
    #graphql
    extend type Query {
      me: User
    }

    type User @key(fields: "id") {
      id: ID!
      name: String!
      fullName: String
      friends: [User]
    }

  `
  const schema = `
    #graphql
    type Query @extends {
      hello: String
    }

    type User @key(fields: "id") @extends {
      id: ID! @external
      name: String @external
      numberOfPosts: Int @requires(fields: "id name")
    }
  `

  const [nodeOne, nodeOnePort] = await createNode(schema)
  const [nodeTwo, nodeTwoPort] = await createNode(schemaAlt)

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
  app.register(import('../index.js'), {})

  const res = await app.inject({
    method: 'GET',
    url: '/federation-schema'
  })
  t.equal(res.statusCode, 200)
})
