import { expectAssignable } from 'tsd'
import type { MercuriusFederationInfoOptions } from '../../index.d.ts'
const mercuriusFederationInfoOptions = {
  enabled: true,
  path: '/federation-schema'
}
expectAssignable<MercuriusFederationInfoOptions>(mercuriusFederationInfoOptions)
