import { FastifyPluginAsync } from 'fastify'

export interface MercuriusFederationInfoOptions {
  enabled: boolean | (() => boolean)
  path: string
}

declare const mercuriusFederationInfo: FastifyPluginAsync<MercuriusFederationInfoOptions>

export default mercuriusFederationInfo
