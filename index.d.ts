import { FastifyPluginAsync } from 'fastify'

export interface MercuriusFederationInfoOptions {
  enabled: boolean
}

declare const mercuriusFederationInfo: FastifyPluginAsync<MercuriusFederationInfoOptions>

export default mercuriusFederationInfo
