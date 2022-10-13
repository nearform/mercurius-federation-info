import { expectAssignable } from 'tsd'
import { MercuriusFederationInfoOptions } from '../../index'
const mercuriusFederationInfoOptions = {
  enabled: true,
  path: '/federation-schema'
}
expectAssignable<MercuriusFederationInfoOptions>(mercuriusFederationInfoOptions)
