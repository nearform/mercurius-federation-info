# Mercurius Federation Info

A Mercurius plugin that exports the structure of the federation.
The plugin can be invoked by sending http `GET` request on route `/federation-schema`.
The response object has this structure:

```json
{
  "status": "OK",
  "nodes": {
    "node-1": { // the name of the federated node
      "__schema": {...}
    },
    "node-2": {
      "__schema": {...}
    }
  }
}
```

The `__schema` object describes the configuration of the federated node.

```json
{
      "__schema": {
        "description": null,
        "queryType": {
          "name": "Query"
        },
        "mutationType": null,
        "subscriptionType": null,
        "types": [...],
        "directives": [...]
      }
    }
}
```

## Quickstart

```js
import Fastify from 'fastify'
import mercurius from 'mercurius'
import mercuriusFederationInfo from 'mercurius-federation-info'

const fastify = Fastify({ logger: true })
fastify.register(mercurius, { schema })
fastify.register(mercuriusFederationInfo, { enabled: true })
```

## Options

- **enabled**

Enables or disables the plugin, default is `true`.
Example:

```js
fastify.register(mercuriusFederationInfo, {
   enabled: false
 }
```
## Example

To test the plugin run `npm run example`