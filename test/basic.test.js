import Fastify from 'fastify'
import mercurius from 'mercurius'
import { test } from 'tap'
import createFederationService from './shared/createFederationService.js'
import { federationInfoGraphiQLPlugin } from '../index.js'
import { readFileSync } from 'fs'

const fileUrl = new URL('../package.json', import.meta.url)
const packageJSON = JSON.parse(readFileSync(fileUrl))

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

  t.teardown(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercurius, {
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
  t.equal(res.statusCode, 200)
  t.equal(version, packageJSON.version)
  t.hasProps(services, ['user', 'customer'])
  const { user, customer } = services
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

  const [serviceOne, serviceOnePort] = await createFederationService(schema)
  const [serviceTwo, serviceTwoPort] = await createFederationService(schemaAlt)

  t.teardown(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercurius, {
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
  t.equal(res.statusCode, 200)
  const {
    services: { user, post }
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

  const [serviceOne, serviceOnePort] = await createFederationService(schema)
  const [serviceTwo, serviceTwoPort] = await createFederationService(schemaAlt)

  t.teardown(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercurius, {
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
  t.equal(res.statusCode, 200)
  const {
    services: { user }
  } = res.json()
  const userObj = user['__schema'].types.find(({ name }) => name === 'User')
  const id = userObj.fields.find(field => field.name === 'id')
  const name = userObj.fields.find(field => field.name === 'name')
  const numberOfPosts = userObj.fields.find(
    field => field.name === 'numberOfPosts'
  )
  t.hasProps(id, ['isExternal'])
  t.hasProps(name, ['isExternal'])
  t.has(numberOfPosts, {
    requires: [
      {
        type: 'StringValue',
        value: 'id name'
      }
    ]
  })
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

  t.teardown(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercurius, {
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
  t.equal(res.statusCode, 200)
  t.hasProps(services, ['user', 'post'])
  const { user, post } = services
  t.hasProp(user, '__schema')
  t.hasProp(post, '__schema')
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

  t.teardown(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercurius, {
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
  t.equal(res.statusCode, 403)
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

  t.teardown(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercurius, {
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

  t.equal(res.statusCode, 200)
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

  t.teardown(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercurius, {
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
  t.equal(res.statusCode, 200)
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

  t.teardown(async () => {
    await app.close()
    await serviceOne.close()
    await serviceTwo.close()
  })

  app.register(mercurius, {
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

  t.equal(res.statusCode, 403)
})
