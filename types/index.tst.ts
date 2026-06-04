import { expect } from 'tstyche'
import type { MercuriusFederationInfoOptions } from './index.js'

const mercuriusFederationInfoOptions = {
  enabled: true,
  path: '/federation-schema'
}

expect(mercuriusFederationInfoOptions).type.toBeAssignableTo<MercuriusFederationInfoOptions>()
