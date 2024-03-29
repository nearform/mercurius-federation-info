# Mercurius Federation Info

A Mercurius plugin that exports the structure of the federation.
The plugin can be invoked by sending http `GET` request on route `/federation-schema`.

The introspection schema is obtained by the native graphQL function `introspectionFromSchema`.

This plugin will improves the default introspection by adding the properties:

- `isExternal: boolean` true if the directive `@external` is present
- `key: Array`: if the directive `@key` is present returns an array with the key fields
- `isExtension: boolean` true if the directive `@extends` is present
- `requires: Array` if the directive `@requires` is present returns an array with the required fields

  
The response object has this structure:

```json
{
  "status": "OK",
  "version": '1.2.3",
  "services": {
    "service-1": { // the name of the federated service
      "__schema": {}
    },
    "service-2": {
      "__schema": {}
    }
  }
}
```

The `__schema` object describes the configuration of the federated service.

```json
{
  "__schema": {
    "description": null,
    "queryType": {
      "name": "Query"
    },
    "mutationType": null,
    "subscriptionType": null,
    "types": [{}],
    "directives": [{}]
  }
}
```

The following GraphQL schema:

```
type User @key(fields: "id") @extends {
  id: ID! @external
  numberOfPosts: Int @requires(fields: "id")
}
```

is described by the following Object inside the field `types` of `__schema`:

```json
{
  "kind": "OBJECT",
  "name": "User",
  "description": null,
  "specifiedByURL": null,
  "fields": [
    {
      "name": "id",
      "description": null,
      "args": [],
      "type": {
        "kind": "NON_NULL",
        "name": null,
        "ofType": {
          "kind": "SCALAR",
          "name": "ID",
          "ofType": null
        }
      },
      "isDeprecated": false,
      "deprecationReason": null,
      "isExternal": true // @external
    },
    {
      "name": "numberOfPosts",
      "description": null,
      "args": [],
      "type": {
        "kind": "SCALAR",
        "name": "Int",
        "ofType": null
      },
      "isDeprecated": false,
      "deprecationReason": null,
      "requires": [ //@requires(fields: "id")
        {
          "type": "StringValue",
          "value": "id"
        }
      ]
    }
  ],
  "inputFields": null,
  "interfaces": [],
  "enumValues": null,
  "possibleTypes": null,
  "isExtension": true, // @extends
  "key": [ // @key(fields: "id")
    {
      "type": "StringValue",
      "value": "id"
    }
  ]
}
```

## Quickstart

```js
import Fastify from 'fastify'
import mercuriusGateway from '@mercuriusjs/gateway'
import mercuriusFederationInfo from 'mercurius-federation-info'

const fastify = Fastify({ logger: true })
fastify.register(mercuriusGateway, { schema })
fastify.register(mercuriusFederationInfo, {})
```

## Options

- `enabled`: `boolean` | `function (schema, source, context) => boolean`.
  Enables or disables the data collection and the enrichment of the response. By default the action is enabled.
- `path`: `string`.
  changes the default route (`/federation-schema`) of the plugin to a custom route.

Examples:

```js
// Data enrichment disabled
app.register(mercuriusFederationInfo, {
   enabled: false
}
```

```js
// Data are collected and returned only if the request has 'x-mercurius-federation-info' header
app.register(explain, {
  enabled: ({ schema, source, context }) =>
    context.reply.request.headers['x-mercurius-federation-info']
})
```


```js
// federation info served on a custom path
app.register(mercuriusFederationInfo, {
   path: '/custom-path'
 }
```


## Add the viewer plugin to mercurius GraphiQL  (mercurius-federation-info-graphiql-plugin)

In `mercurius` it is possibile to add to the self hosted GraphiQL app
the plugin [mercurius-federation-info-graphiql-plugin](https://github.com/nearform/mercurius-federation-info-graphiql-plugin) to show the data returned by `mercurius explain`.

### federationInfoGraphiQLPlugin helper
This function return the required structure to initialize the plugin.

`federationInfoGraphiQLPlugin`: `function(options)`
- `options`: `null` | `object`
  - `options.version`: `string`. The version of the GraphiQL plugin to be loaded. Default: the same major version of the backend plugin

**Example**
```js
import { federationInfoGraphiQLPlugin } from 'mercurius-federation-info'

app.register(mercurius, {
  schema,
  resolvers,
  graphiql: {
    plugins: [federationInfoGraphiQLPlugin()]
  }
})
```

The `federationInfoGraphiQLPlugin` function initializes by default the plugin with the same major version in the `package.json` (eg. if the package is `3.4.5` it will load the version `^3` of the GraphiQL plugin).

It's possible to override the version by passing a parameter.

```javascript
...
plugins: [federationInfoGraphiQLPlugin({version: '3.4.5')]

// or 

plugins: [federationInfoGraphiQLPlugin({version: '^4')]
...
```
