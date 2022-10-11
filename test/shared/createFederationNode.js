import Fastify from 'fastify'
import mercurius from 'mercurius'

async function createNode(schema, resolvers) {
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

export async function createNodeOne() {
  const posts = {
    p1: {
      pid: 'p1',
      title: 'Post 1',
      content: 'Content 1',
      authorId: 'u1'
    },
    p2: {
      pid: 'p2',
      title: 'Post 2',
      content: 'Content 2',
      authorId: 'u2'
    },
    p3: {
      pid: 'p3',
      title: 'Post 3',
      content: 'Content 3',
      authorId: 'u1'
    },
    p4: {
      pid: 'p4',
      title: 'Post 4',
      content: 'Content 4',
      authorId: 'u2'
    }
  }

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

  const resolvers = {
    Post: {
      __resolveReference: post => {
        return posts[post.pid]
      },
      author: post => {
        return {
          __typename: 'User',
          id: post.authorId
        }
      }
    },
    User: {
      posts: user => {
        return Object.values(posts).filter(p => p.authorId === user.id)
      },
      numberOfPosts: user => {
        return Object.values(posts).filter(p => p.authorId === user.id).length
      }
    },
    Query: {
      topPosts: (root, { count = 2 }) => Object.values(posts).slice(0, count)
    },
    Mutation: {
      createPost: (root, { post }) => {
        const pid = `p${Object.values(posts).length + 1}`

        const result = {
          pid,
          ...post
        }
        posts[pid] = result

        return result
      },
      updateHello: () => 'World'
    }
  }

  return createNode(schema, resolvers)
}

export async function createNodeTwo() {
  const users = {
    u1: {
      id: 'u1',
      name: 'John'
    },
    u2: {
      id: 'u2',
      name: 'Jane'
    },
    u3: {
      id: 'u3',
      name: 'Jack'
    }
  }

  const schema = `
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

  const resolvers = {
    Query: {
      me: () => {
        return users.u1
      },
      you: () => {
        throw new Error("Can't fetch other users data, NOT_ALLOWED")
      },
      hello: () => 'world'
    },
    User: {
      __resolveReference: user => {
        return users[user.id]
      },
      avatar: (user, { size }) => `avatar-${size}.jpg`,
      friends: user => Object.values(users).filter(u => u.id !== user.id),
      fullName: user => user.name + ' Doe'
    }
  }
  return createNode(schema, resolvers)
}
