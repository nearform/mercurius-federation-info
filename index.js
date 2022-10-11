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
          updateExtensionDirective(type, value)
          updateRequireField(type, value)
          updateKeyDirective(type, value)
        })
        acc[name] = introspection
        return acc
      },
      {}
    )

    return { status: 'OK', nodes: servicesIntrospection }
  })
})

function updateExtensionDirective(type, value) {
  if (
    value.schema._typeMap[type.name]?.extensionASTNodes[0]?.directives?.find(
      directive => directive?.name?.value === 'extends'
    )
  ) {
    type.isExtension = true
  }
}

function updateRequireField(type, value) {
  const directives = value.schema._typeMap[
    type.name
  ]?.extensionASTNodes[0]?.fields.map(field => {
    field.name.value
  })
  console.log(JSON.stringify(directives, null, 2))
}

function updateKeyDirective(type, value) {
  const key = value.schema._typeMap[
    type.name
  ]?.extensionASTNodes[0]?.directives?.find(
    directive => directive?.name?.value === 'key'
  )

  if (key) {
    type.key = key.arguments.map(arg => ({
      name: arg.kind.name,
      type: arg.value.kind,
      value: arg.value.value
    }))
  }
}
