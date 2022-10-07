import fp from 'fastify-plugin'
import graphql from 'graphql'

export default fp(async fastify => {
  fastify.get('/federation-schema', () => {
    const serviceMap = fastify.graphql.gateway.serviceMap

    const servicesIntrospection = Object.entries(serviceMap).reduce(
      (acc, [name, value]) => {
        const introspection = graphql.introspectionFromSchema(value.schema, {
          descriptions: true,
          schemaDescription: true,
          inputValueDeprecation: true
        })

        introspection.__schema.types.forEach(type => {
          if (type.name.startsWith('_') || type.kind === 'SCALAR') return
          if (
            value.schema._typeMap.User.extensionASTNodes[0]?.directives?.find(
              directive => directive?.name?.value === 'extends'
            )
          ) {
            type.isExtension = true
          }
        })
        acc[name] = introspection
        return acc
      },
      {}
    )

    return { status: 'OK', nodes: servicesIntrospection }
  })
})
