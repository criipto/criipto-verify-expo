package expo.modules.criiptoverify

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

data class StartParams(
  @Field
  val authorizeUrl: String,
  @Field
  val redirectUri: String,
) : Record
