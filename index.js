import fp from 'fastify-plugin'
import graphql from 'graphql'

const defaultOptions = {
  enabled: true
}

export default fp(async (fastify, userOptions) => {
  const options = { ...defaultOptions, ...userOptions }
  if (!options.enabled) return
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
          updateExternalField(type, value)
          updateKeyDirective(type, value)
          updateRequireField(type, value)
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
  type.fields?.forEach(typeField => {
    const fieldFound = value.schema._typeMap[
      type.name
    ]?.extensionASTNodes[0]?.fields.find(f => typeField.name === f.name.value)
    const requireDirective = fieldFound?.directives?.find(
      directive => directive.name.value === 'requires'
    )
    if (requireDirective) {
      typeField.requires = requireDirective.arguments.map(arg => ({
        name: arg.kind.name,
        type: arg.value.kind,
        value: arg.value.value
      }))
    }
  })
}

function updateExternalField(type, value) {
  type.fields?.forEach(typeField => {
    const fieldFound = value.schema._typeMap[
      type.name
    ]?.extensionASTNodes[0]?.fields.find(f => typeField.name === f.name.value)
    if (
      fieldFound?.directives?.find(
        directive => directive.name.value === 'external'
      )
    ) {
      typeField.isExternal = true
    }
  })
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
