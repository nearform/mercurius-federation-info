import { expectAssignable } from 'tsd'
import { MercuriusFederationInfoOptions } from '../../index'
const mercuriusFederationInfoOptions = {
  enabled: true
}
expectAssignable<MercuriusFederationInfoOptions>(mercuriusFederationInfoOptions)
