import mercuriusGateway from '@mercuriusjs/gateway'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import { readFileSync } from 'fs'
import { test } from 'node:test'
import { federationInfoGraphiQLPlugin } from '../index.js'
import createFederationService from './shared/createFederationService.js'

const fileUrl = new URL('../package.json', import.meta.url)
const packageJSON = JSON.parse(readFileSync(fileUrl))

test('"/federation-schema" returns a 404 error if fastify is instantiated without the gateway, and logs an error message', async t => {
  const calledLogs = {}

  const app = Fastify()
  app.log.info = text => {
    calledLogs[text] = (calledLogs[text] || 0) + 1
  }

  const fakeGateway = fp(async () => {}, {
    name: 'fake-gateway',
    dependencies: []
  })

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
  const [serviceOne, serviceOnePort] = await createFederationService(schema)
  const [serviceTwo, serviceTwoPort] = await createFederationService(schemaAlt)

  t.after(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(fakeGateway, {
    graphiql: {
      enabled: true,
      plugins: [federationInfoGraphiQLPlugin()]
    },
    gateway: {
      services: [
        {
          name: 'user',
          url: `http://localhost:${serviceOnePort}`
        },
        {
          name: 'customer',
          url: `http://localhost:${serviceTwoPort}`
        }
      ]
    }
  })
  app.register(import('../index.js'), {})

  const res = await app.inject({
    method: 'GET',
    url: '/federation-schema'
  })

  t.assert.strictEqual(res.statusCode, 404)
  t.assert.strictEqual(
    calledLogs[
      'mercurius-federation-info: init error, mercurius gateway not found'
    ],
    1
  )
})

test('return federation info values', async t => {
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
  const [serviceOne, serviceOnePort] = await createFederationService(schema)
  const [serviceTwo, serviceTwoPort] = await createFederationService(schemaAlt)

  t.after(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercuriusGateway, {
    graphiql: {
      enabled: true,
      plugins: [federationInfoGraphiQLPlugin()]
    },
    gateway: {
      services: [
        {
          name: 'user',
          url: `http://localhost:${serviceOnePort}`
        },
        {
          name: 'customer',
          url: `http://localhost:${serviceTwoPort}`
        }
      ]
    }
  })
  app.register(import('../index.js'), {})

  const res = await app.inject({
    method: 'GET',
    url: '/federation-schema'
  })
  const { services, version } = res.json()
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(version, packageJSON.version)
  t.assert.ok(services.user)
  t.assert.ok(services.customer)
  const { user, customer } = services
  t.assert.ok(user['__schema'])
  t.assert.ok(customer['__schema'])
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

  const [serviceOne, serviceOnePort] = await createFederationService(schema)
  const [serviceTwo, serviceTwoPort] = await createFederationService(schemaAlt)

  t.after(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercuriusGateway, {
    gateway: {
      services: [
        {
          name: 'user',
          url: `http://localhost:${serviceOnePort}`
        },
        {
          name: 'post',
          url: `http://localhost:${serviceTwoPort}`
        }
      ]
    }
  })
  app.register(import('../index.js'), {})

  const res = await app.inject({
    method: 'GET',
    url: '/federation-schema'
  })
  t.assert.strictEqual(res.statusCode, 200)
  const {
    services: { user, post }
  } = res.json()
  const userObj = user['__schema'].types.find(({ name }) => name === 'User')
  const postObj = post['__schema'].types.find(({ name }) => name === 'Post')
  t.assert.ok(userObj)
  t.assert.ok(postObj)
  t.assert.ok(userObj['key'])
  t.assert.ok(userObj['isExtension'])
  t.assert.ok(postObj['key'])
  t.assert.ok(postObj['isExtension'])
  t.assert.ok(postObj.isExtension)
  t.assert.ok(postObj.key[0])
  t.assert.ok(postObj.key[0].type === 'StringValue')
  t.assert.ok(postObj.key[0].value === 'pid')
  t.assert.ok(userObj.isExtension)
  t.assert.ok(userObj.key[0])
  t.assert.ok(userObj.key[0].type === 'StringValue')
  t.assert.ok(userObj.key[0].value === 'id')
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

  const [serviceOne, serviceOnePort] = await createFederationService(schema)
  const [serviceTwo, serviceTwoPort] = await createFederationService(schemaAlt)

  t.after(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercuriusGateway, {
    gateway: {
      services: [
        {
          name: 'user',
          url: `http://localhost:${serviceOnePort}`
        },
        {
          name: 'post',
          url: `http://localhost:${serviceTwoPort}`
        }
      ]
    }
  })
  app.register(import('../index.js'), {})

  const res = await app.inject({
    method: 'GET',
    url: '/federation-schema'
  })
  t.assert.strictEqual(res.statusCode, 200)
  const {
    services: { user }
  } = res.json()
  const userObj = user['__schema'].types.find(({ name }) => name === 'User')
  const id = userObj.fields.find(field => field.name === 'id')
  const name = userObj.fields.find(field => field.name === 'name')
  const numberOfPosts = userObj.fields.find(
    field => field.name === 'numberOfPosts'
  )
  t.assert.ok(id.isExternal)
  t.assert.ok(name.isExternal)
  t.assert.ok(numberOfPosts.requires[0])
  t.assert.ok(numberOfPosts.requires[0].type === 'StringValue')
  t.assert.ok(numberOfPosts.requires[0].value === 'id name')
})

test('should handle resolvers, mutations, subscription', async t => {
  const app = Fastify()

  const schemaAlt = `
    #graphql
    extend type Query {
      me: User
      you: User
      hello: String
    }

    type User @key(fields: "id") {
      id: ID!
      name: String!
      fullName: String
      avatar(size: AvatarSize): String
      friends: [User]
    }

    enum AvatarSize {
      small
      medium
      large
    }
  `
  const schema = `
    #graphql
    type Post @key(fields: "pid") {
      pid: ID!
      title: String
      content: String
      author: User @requires(fields: "pid title")
    }

    type Query @extends {
      topPosts(count: Int): [Post]
    }

    type User @key(fields: "id") @extends {
      id: ID! @external
      name: String @external
      posts: [Post]
      numberOfPosts: Int @requires(fields: "id name")
    }

    extend type Mutation {
      createPost(post: PostInput!): Post
      updateHello: String
    }

    input PostInput {
      title: String!
      content: String!
      authorId: String!
    }
  `

  const [serviceOne, serviceOnePort] = await createFederationService(schema)
  const [serviceTwo, serviceTwoPort] = await createFederationService(schemaAlt)

  t.after(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercuriusGateway, {
    gateway: {
      services: [
        {
          name: 'user',
          url: `http://localhost:${serviceOnePort}`
        },
        {
          name: 'post',
          url: `http://localhost:${serviceTwoPort}`
        }
      ]
    }
  })
  app.register(import('../index.js'), {})

  const res = await app.inject({
    method: 'GET',
    url: '/federation-schema'
  })
  const { services } = res.json()
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.ok(services.user)
  t.assert.ok(services.post)
  const { user, post } = services
  t.assert.ok(user['__schema'])
  t.assert.ok(post['__schema'])
})

test('enabled false should return 403', async t => {
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
  const [serviceOne, serviceOnePort] = await createFederationService(schema)
  const [serviceTwo, serviceTwoPort] = await createFederationService(schemaAlt)

  t.after(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercuriusGateway, {
    gateway: {
      services: [
        {
          name: 'user',
          url: `http://localhost:${serviceOnePort}`
        },
        {
          name: 'customer',
          url: `http://localhost:${serviceTwoPort}`
        }
      ]
    }
  })
  app.register(import('../index.js'), { enabled: false })

  const res = await app.inject({
    method: 'GET',
    url: '/federation-schema'
  })
  t.assert.strictEqual(res.statusCode, 403)
})

test('should apply default values if options is undefined', async t => {
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
  const [serviceOne, serviceOnePort] = await createFederationService(schema)
  const [serviceTwo, serviceTwoPort] = await createFederationService(schemaAlt)

  t.after(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercuriusGateway, {
    gateway: {
      services: [
        {
          name: 'user',
          url: `http://localhost:${serviceOnePort}`
        },
        {
          name: 'customer',
          url: `http://localhost:${serviceTwoPort}`
        }
      ]
    }
  })
  app.register(import('../index.js'), undefined)

  const res = await app.inject({
    method: 'GET',
    url: '/federation-schema'
  })

  t.assert.strictEqual(res.statusCode, 200)
})

test('enabled should be a function', async t => {
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
  const [serviceOne, serviceOnePort] = await createFederationService(schema)
  const [serviceTwo, serviceTwoPort] = await createFederationService(schemaAlt)

  t.after(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercuriusGateway, {
    gateway: {
      services: [
        {
          name: 'user',
          url: `http://localhost:${serviceOnePort}`
        },
        {
          name: 'customer',
          url: `http://localhost:${serviceTwoPort}`
        }
      ]
    }
  })
  app.register(import('../index.js'), {
    enabled: ({ request }) => {
      return request.headers.allowed
    }
  })

  const res = await app.inject({
    method: 'GET',
    headers: {
      allowed: true
    },
    url: '/federation-schema'
  })
  t.assert.strictEqual(res.statusCode, 200)
})

test('should catch handle error', async t => {
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
  const [serviceOne, serviceOnePort] = await createFederationService(schema)
  const [serviceTwo, serviceTwoPort] = await createFederationService(schemaAlt)

  t.after(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercuriusGateway, {
    gateway: {
      services: [
        {
          name: 'user',
          url: `http://localhost:${serviceOnePort}`
        },
        {
          name: 'customer',
          url: `http://localhost:${serviceTwoPort}`
        }
      ]
    }
  })
  app.register(import('../index.js'), {
    enabled: () => {
      throw new Error()
    }
  })

  const res = await app.inject({
    method: 'GET',
    headers: {
      allowed: true
    },
    url: '/federation-schema'
  })

  t.assert.strictEqual(res.statusCode, 403)
})
