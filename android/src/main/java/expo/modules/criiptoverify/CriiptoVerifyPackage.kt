package expo.modules.criiptoverify

import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import eu.idura.verify.IduraVerify
import expo.modules.core.BasePackage
import expo.modules.core.interfaces.ReactActivityLifecycleListener

internal const val META_DOMAIN = "criipto.verify.domain"
internal const val META_CLIENT_ID = "criipto.verify.clientId"

/**
 * Holds the lazily-constructed `IduraVerify` instance between the host Activity's `onCreate` (where
 * it must be built, before the Activity reaches STARTED, so the SDK can register its
 * `ActivityResultLauncher`s) and the Expo module's `AsyncFunction("login")` calls (which run much
 * later, on the JS thread).
 */
internal object CriiptoVerifyState {
  var result: Result<IduraVerify>? = null
}

/**
 * Registered automatically by Expo autolinking because this file ends in `Package.kt` and imports
 * `expo.modules.core.BasePackage`. The module system's `OnCreate` hook fires on first JS access —
 * typically once the host Activity is already RESUMED — which is too late for `IduraVerify`'s
 * pre-STARTED constructor precondition. A `ReactActivityLifecycleListener` is the only hook that
 * runs inside `MainActivity.onCreate`, so the SDK is built here and stashed in `CriiptoVerifyState`
 * for the module to read later.
 */
class CriiptoVerifyPackage : BasePackage() {
  override fun createReactActivityLifecycleListeners(
    activityContext: Context?,
  ): List<ReactActivityLifecycleListener> =
    listOf(
      object : ReactActivityLifecycleListener {
        override fun onCreate(
          activity: Activity?,
          savedInstanceState: Bundle?,
        ) {
          val componentActivity = activity as? ComponentActivity ?: return
          CriiptoVerifyState.result =
            runCatching {
              val metaData =
                componentActivity.packageManager
                  .getApplicationInfo(
                    componentActivity.packageName,
                    PackageManager.GET_META_DATA,
                  ).metaData
              val domain =
                metaData?.getString(META_DOMAIN)
                  ?: throw MissingManifestConfigException(META_DOMAIN)
              val clientID =
                metaData.getString(META_CLIENT_ID)
                  ?: throw MissingManifestConfigException(META_CLIENT_ID)
              IduraVerify(
                clientID = clientID,
                domain = domain,
                activity = componentActivity,
              )
            }
        }
      },
    )
}
