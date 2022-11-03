import { readFileSync } from 'fs'
import fp from 'fastify-plugin'
import semver from 'semver'
import graphql from 'graphql'
import { DEFAULT_OPTIONS } from './lib/constant.js'
import {
  updateExtensionDirective,
  updateExternalField,
  updateKeyDirective,
  updateRequireField
} from './lib//directive.js'

const fileUrl = new URL('./package.json', import.meta.url)
const packageJSON = JSON.parse(readFileSync(fileUrl))

export default fp(async (fastify, userOptions) => {
  const options = { ...DEFAULT_OPTIONS, ...userOptions }
  fastify.get('/federation-schema', async (request, reply, context) => {
    const enabled = await isEnabled(options, { request, reply, context })
    if (!enabled) reply.code(403).send({ code: 403, message: 'Disabled' })
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
    return {
      status: 'OK',
      version: packageJSON.version,
      services: servicesIntrospection
    }
  })
})

async function isEnabled(options, { request, reply, context }) {
  try {
    return typeof options.enabled === 'function'
      ? options.enabled({ request, reply, context })
      : options.enabled
  } catch (error) {
    return false
  }
}

export function federationInfoGraphiQLPlugin({
  federationSchemaUrl = '/federation-schema',
  version
} = {}) {
  const packageVersion = version || `^${semver.major(packageJSON.version)}`
  return {
    props: {
      federationSchemaUrl
    },
    name: 'federationInfo',
    umdUrl: `https://unpkg.com/mercurius-federation-info-graphiql-plugin@${packageVersion}/dist/umd/index.js`
  }
}
