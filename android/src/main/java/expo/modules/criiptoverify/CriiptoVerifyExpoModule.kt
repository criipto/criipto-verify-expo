package expo.modules.criiptoverify

import eu.idura.verify.Prompt
import eu.idura.verify.eid.EID
import eu.idura.verify.eid.Other
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class LoginParams : Record {
  @Field
  var acrValues: String = ""

  @Field
  var scope: String? = null

  @Field
  var loginHint: String? = null

  @Field
  var prompt: String? = null
}

class ModuleNotConfiguredException :
  CodedException(
    "IduraVerify was never initialised — CriiptoVerifyPackage's ReactActivityLifecycleListener did not run. Is the host Activity a ComponentActivity, and is @criipto/verify-expo listed under expo.plugins in app.json?",
  )

class MissingManifestConfigException(
  key: String,
) : CodedException(
    "Missing <meta-data android:name=\"$key\"> in AndroidManifest — configure the @criipto/verify-expo Expo plugin with 'domain' and 'clientID' options, then run `expo prebuild`.",
  )

class UnknownPromptException(
  value: String,
) : CodedException("Unknown prompt value: '$value'")

class CriiptoVerifyExpoModule : Module() {
  override fun definition() =
    ModuleDefinition {
      Name("CriiptoVerifyExpo")

      AsyncFunction("login") Coroutine { params: LoginParams ->
        val sdk =
          CriiptoVerifyState.result?.getOrThrow()
            ?: throw ModuleNotConfiguredException()
        val jwt = sdk.login(buildEid(params), params.prompt?.let(::parsePrompt))
        return@Coroutine mapOf("id_token" to jwt.token)
      }
    }
}

private fun buildEid(params: LoginParams): EID<*> {
  val eid = Other(params.acrValues)
  params.scope
    ?.split(' ')
    ?.filter { it.isNotBlank() }
    ?.forEach { eid.withScope(it) }
  params.loginHint
    ?.split(' ')
    ?.filter { it.isNotBlank() }
    ?.forEach { eid.withLoginHint(it) }
  return eid
}

private fun parsePrompt(value: String): Prompt =
  when (value.lowercase()) {
    "login" -> Prompt.Login
    "none" -> Prompt.None
    "consent" -> Prompt.Consent
    "consent_revoke" -> Prompt.ConsentRevoke
    else -> throw UnknownPromptException(value)
  }
