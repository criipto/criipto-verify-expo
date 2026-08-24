package expo.modules.criiptoverify

import android.content.pm.PackageManager
import android.util.Log
import androidx.activity.ComponentActivity
import eu.idura.verify.IduraVerify
import eu.idura.verify.Prompt
import eu.idura.verify.eid.EID
import eu.idura.verify.eid.Other
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import eu.idura.verify.IduraVerifyInternalException as SdkInternalException
import eu.idura.verify.NoSuitableBrowserException as SdkNoSuitableBrowserException
import eu.idura.verify.OAuthException as SdkOAuthException
import eu.idura.verify.UserCancelledException as SdkUserCancelledException

private const val TAG = "CriiptoVerifyExpo"

private const val META_DOMAIN = "criipto.verify.domain"
private const val META_CLIENT_ID = "criipto.verify.clientId"

private fun missingManifestKeyMessage(key: String): String =
  "Missing <meta-data android:name=\"$key\"> in AndroidManifest — configure the @criipto/verify-expo Expo plugin with 'domain' and 'clientID' options, then run `expo prebuild`."

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
  /**
   * The lazily-built SDK, and the activity it was built for. `IduraVerify` is bound to that
   * activity — it registers its activity result launchers against it and stops working once the
   * activity is destroyed — so the instance is only reused while that activity is still the
   * current one. Touched exclusively from the main thread, in [ensureSdk].
   */
  private var sdk: IduraVerify? = null
  private var sdkActivity: ComponentActivity? = null

  override fun definition() =
    ModuleDefinition {
      Name("CriiptoVerifyExpo")

      OnActivityDestroys {
        // Nothing to dispose — the SDK observes the activity lifecycle and cleans itself up. This
        // only drops our reference so the destroyed activity is not retained until the next login.
        // Guarded on the cached activity actually being gone: releasing a live instance would make
        // the next login construct a second one against the same activity, which the SDK rejects.
        sdkActivity?.let {
          if (it.isDestroyed || it.isFinishing) {
            sdk = null
            sdkActivity = null
          }
        }
      }

      // The body is attached by reference, with an explicit type argument, rather than in the
      // infix `Coroutine { ... }` form `login` uses below: for a zero-argument body the zero-arg
      // and one-arg `Coroutine` overloads are ambiguous (a bare lambda could still take an
      // implicit `it`), and ktlint deletes the `{ -> }` that would disambiguate it.
      AsyncFunction("warmUp").Coroutine<Unit>(this@CriiptoVerifyExpoModule::warmUp)

      AsyncFunction("login") Coroutine
        { params: LoginParams ->
          return@Coroutine try {
            // Constructing the SDK registers activity result launchers and adds a lifecycle
            // observer, both main-thread only. The Coroutine body runs off the main thread, which
            // is where `login` itself wants to be, so only the construction hops over.
            val sdk = withContext(Dispatchers.Main) { ensureSdk() }
            val result = sdk.login(buildEid(params), params.prompt?.let(::parsePrompt))
            NativeLoginResult.Success().apply {
              idToken = result.jwt.token
              traceId = result.traceId
            }
          } catch (e: SdkUserCancelledException) {
            NativeLoginResult.UserCancelled().apply { traceId = e.traceId }
          } catch (e: SdkNoSuitableBrowserException) {
            NativeLoginResult.NoSuitableBrowser().apply { traceId = e.traceId }
          } catch (e: SdkOAuthException) {
            NativeLoginResult.OAuthError().apply {
              error = e.error
              errorDescription = e.errorDescription
              traceId = e.traceId
            }
          } catch (e: SdkInternalException) {
            NativeLoginResult.InternalError().apply {
              message = e.message ?: "Idura Verify SDK failure"
              traceId = e.traceId
            }
          } catch (e: ModuleNotConfiguredException) {
            NativeLoginResult.ModuleNotConfigured().apply { message = e.message!! }
          } catch (e: UnknownPromptException) {
            NativeLoginResult.UnknownPrompt().apply { value = e.value }
          } catch (e: Exception) {
            // Constructing the SDK can fail in ways that are not our own exception types — no
            // foreground activity, or a rejected duplicate instance. Nothing may leave this
            // function as a raw throw, or the bridge turns it into a `CodedException` the JS
            // wrapper does not know how to map.
            NativeLoginResult.InternalError().apply {
              message = e.message ?: e::class.java.name
            }
          }
        }
    }

  /**
   * Optional warm-up. Constructing the SDK prefetches the OIDC configuration and JWKS and scans for
   * a usable browser, work that otherwise lands on the first login. Silent by design: `login()`
   * builds the SDK the same way and reports a real misconfiguration to the caller, so there is
   * nothing here a consumer has to handle. Still logged, because a warm-up that quietly does
   * nothing is otherwise invisible while developing an integration.
   */
  private suspend fun warmUp() {
    runCatching { withContext(Dispatchers.Main) { ensureSdk() } }
      .onFailure { Log.w(TAG, "warmUp() could not build the SDK", it) }
  }

  /**
   * Builds the SDK on first use, mirroring the iOS module's `ensureSdk()`. Must run on the main
   * thread: `IduraVerify`'s constructor adds a lifecycle observer, and `LifecycleRegistry` enforces
   * the main thread for that.
   */
  private fun ensureSdk(): IduraVerify {
    val activity =
      appContext.currentActivity
        ?: throw IllegalStateException(
          "login() was called while the app had no current Activity — call it from a mounted screen.",
        )
    val componentActivity =
      activity as? ComponentActivity
        ?: throw ModuleNotConfiguredException(
          "The host Activity (${activity::class.java.name}) is not a ComponentActivity, which the Idura Verify Android SDK requires.",
        )

    sdk?.let { if (sdkActivity === componentActivity) return it }

    val metaData =
      componentActivity.packageManager
        .getApplicationInfo(
          componentActivity.packageName,
          PackageManager.GET_META_DATA,
        ).metaData
    val domain =
      metaData?.getString(META_DOMAIN)
        ?: throw ModuleNotConfiguredException(missingManifestKeyMessage(META_DOMAIN))
    val clientID =
      metaData.getString(META_CLIENT_ID)
        ?: throw ModuleNotConfiguredException(missingManifestKeyMessage(META_CLIENT_ID))

    return IduraVerify(
      clientID = clientID,
      domain = domain,
      activity = componentActivity,
    ).also {
      sdk = it
      sdkActivity = componentActivity
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
