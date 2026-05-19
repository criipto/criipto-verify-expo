package expo.modules.criiptoverify

import eu.idura.verify.Prompt
import eu.idura.verify.eid.EID
import eu.idura.verify.eid.Other
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

class ModuleNotConfiguredException(
  message: String,
) : Exception(message)

class UnknownPromptException(
  val value: String,
) : Exception("Unknown prompt value: '$value'")

// Every outcome — SDK calls, preflight setup, input validation — is returned as a
// `NativeLoginResult` Record. The JS wrapper switches on `kind` and re-throws the
// matching typed error class, so consumers never see a raw `CodedException` from the
// bridge. The variant classes live in NativeLoginResult.kt, generated from
// src/NativeLoginResult.d.ts via `npm run generate-native-types`.
class CriiptoVerifyExpoModule : Module() {
  override fun definition() =
    ModuleDefinition {
      Name("CriiptoVerifyExpo")

      AsyncFunction("login") Coroutine
        { params: LoginParams ->
          return@Coroutine try {
            val sdk =
              CriiptoVerifyState.result?.getOrThrow()
                ?: throw ModuleNotConfiguredException(
                  "IduraVerify was never initialised — CriiptoVerifyPackage's ReactActivityLifecycleListener did not run. Is the host Activity a ComponentActivity, and is @criipto/verify-expo listed under expo.plugins in app.json?",
                )
            val result = sdk.login(buildEid(params), params.prompt?.let(::parsePrompt))
            NativeLoginResult.Success().apply { idToken = result.jwt.token }
          } catch (_: SdkUserCancelledException) {
            NativeLoginResult.UserCancelled()
          } catch (_: SdkNoSuitableBrowserException) {
            NativeLoginResult.NoSuitableBrowser()
          } catch (e: SdkOAuthException) {
            NativeLoginResult.OAuthError().apply {
              error = e.error
              errorDescription = e.errorDescription
            }
          } catch (e: SdkInternalException) {
            NativeLoginResult.InternalError().apply {
              message = e.message ?: "Idura Verify SDK failure"
            }
          } catch (e: ModuleNotConfiguredException) {
            NativeLoginResult.ModuleNotConfigured().apply { message = e.message!! }
          } catch (e: UnknownPromptException) {
            NativeLoginResult.UnknownPrompt().apply { value = e.value }
          }
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
  params.action?.let { eid.withLoginHint("action:$it") }
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
