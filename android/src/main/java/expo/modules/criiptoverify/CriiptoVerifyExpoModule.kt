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
import eu.idura.verify.IduraVerifyInternalException as SdkInternalException
import eu.idura.verify.NoSuitableBrowserException as SdkNoSuitableBrowserException
import eu.idura.verify.OAuthException as SdkOAuthException
import eu.idura.verify.UserCancelledException as SdkUserCancelledException

class LoginParams : Record {
  @Field var acrValues: String = ""

  @Field var scope: String? = null

  @Field var loginHint: String? = null

  @Field var prompt: String? = null

  @Field var action: String? = null
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

// Mirror the SDK's typed exceptions into CodedExceptions so the JS side gets stable
// error codes and can rethrow as `UserCancelledError` / `OAuth2Error` to match the
// iOS surface. The OAuth error/description pair is round-tripped as a tab-separated
// message because `CodedException` only carries `code` + `message` across the bridge.
class UserCancelledException : CodedException("User cancelled login")

class NoSuitableBrowserException : CodedException("No suitable browser found")

class OAuthException(
  error: String,
  errorDescription: String?,
) : CodedException(
    "ERR_OAUTH",
    buildString {
      append(error)
      append('\t')
      if (errorDescription != null) append(errorDescription)
    },
    null,
  )

class InternalException(
  message: String,
  cause: Throwable?,
) : CodedException(message, cause)

class CriiptoVerifyExpoModule : Module() {
  override fun definition() =
    ModuleDefinition {
      Name("CriiptoVerifyExpo")

      AsyncFunction("login") Coroutine
        { params: LoginParams ->
          val sdk =
            CriiptoVerifyState.result?.getOrThrow()
              ?: throw ModuleNotConfiguredException()
          val jwt =
            try {
              sdk.login(buildEid(params), params.prompt?.let(::parsePrompt))
            } catch (e: SdkUserCancelledException) {
              throw UserCancelledException()
            } catch (e: SdkNoSuitableBrowserException) {
              throw NoSuitableBrowserException()
            } catch (e: SdkOAuthException) {
              throw OAuthException(e.error, e.errorDescription)
            } catch (e: SdkInternalException) {
              throw InternalException(e.message ?: "Idura Verify SDK failure", e)
            }
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
