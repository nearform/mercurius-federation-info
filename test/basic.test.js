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
      id: ID
      name: String
      fullName: String
    }`

  const schema = `
    type Query {
      customer: Customer
    }
    type Customer{
      age: Int
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
          name: 'customer',
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
  const { nodes } = res.json()
  t.equal(res.statusCode, 200)
  t.hasProps(nodes, ['user', 'customer'])
  const { user, customer } = nodes
  t.hasProp(user, '__schema')
  t.hasProp(customer, '__schema')
})

test('directives are included in the info', async t => {
  const app = Fastify()

  const schemaAlt = `
    type User @key(fields: "id") {
      id: ID
      name: String
      fullName: String
      friends: [User]
    }
    
    type Post  @key(fields: "pid") @extends {
      status: String
    }
    `

  const schema = `
  type Query {
    me: User
  }

  type Post @key(fields: "pid") {
    pid: ID
    title: String
    content: String
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
  const {
    nodes: { user, post }
  } = res.json()
  const userObj = user['__schema'].types.find(({ name }) => name === 'User')
  const postObj = post['__schema'].types.find(({ name }) => name === 'Post')
  t.ok(userObj)
  t.ok(postObj)
  t.hasProps(userObj, ['key', 'isExtension'])
  t.hasProps(postObj, ['key', 'isExtension'])
  t.has(postObj, {
    isExtension: true,
    key: [
      {
        type: 'StringValue',
        value: 'pid'
      }
    ]
  })
  t.has(userObj, {
    isExtension: true,
    key: [
      {
        type: 'StringValue',
        value: 'id'
      }
    ]
  })
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
