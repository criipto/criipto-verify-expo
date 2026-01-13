// Heavily inspired by
// https://github.com/openid/AppAuth-Android/blob/master/library/java/net/openid/appauth/AuthorizationManagementActivity.java

package expo.modules.criiptoverify

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent

private const val TAG = "CriiptoVerifyActivity"
private const val KEY_AUTHORIZE_URL = "authorizeUrl"
private const val KEY_REDIRECT_URI = "redirectUri"
private const val KEY_AUTHORIZATION_STARTED = "authorizationStarted"

class CriiptoVerifyActivity : AppCompatActivity() {
  var authorizationStarted: Boolean = false
  var authorizeUrl: String? = null
  var redirectUri: String? = null
  var intermediateResponse: Uri? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (savedInstanceState == null) {
      var extras = getIntent()?.getExtras()
      if (extras == null) {
        var data = getIntent()?.getData()
        Log.v(TAG, "CriiptoVerifyActivity.onCreate with no extras (data: " + data.toString())
        if (data != null) {
          intermediateResponse = data
        }
        return
      }
      extractState(extras)
    } else {
      Log.v(TAG, "CriiptoVerifyActivity.onCreate with saved instance state")
      extractState(savedInstanceState)
    }
  }

  override fun onResume() {
    super.onResume()

    /*
     * Detected intermediate response/redirect from MitID app kill this activity so we can resume to
     * the primary activity with the browser
     */
    if (intermediateResponse != null) {
      Log.v(
        TAG,
        "CriiptoVerifyActivity.onResume: intermediate response" +
          getIntent().getData().toString(),
      )
      finish()
      return
    }

    // Start new browser flow
    if (!authorizationStarted) {
      Log.v(TAG, "CriiptoVerifyActivity.onResume: start authorization")
      val intent = createCustomTabsIntent().apply { data = Uri.parse(authorizeUrl) }

      startActivity(intent)
      authorizationStarted = true
      return
    }

    // User dismissed browser
    if (getIntent().getData() == null) {
      setResult(Activity.RESULT_OK, Intent())
      finish()
      return
    }
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    val data = intent?.getData()

    Log.v(TAG, "CriiptoVerifyActivity.onNewIntent " + data.toString())

    if (data != null && data.isHierarchical) {
      if (data.getQueryParameter("error") != null || data.getQueryParameter("code") != null) {
        var resultIntent = Intent().apply { setData(data) }
        setResult(Activity.RESULT_OK, resultIntent)
        finish()
      }
    }
  }

  private fun createCustomTabsIntent(): Intent {
    val builder = CustomTabsIntent.Builder()

    return builder.build().intent.apply { addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP) }
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    outState.apply {
      putString(KEY_AUTHORIZE_URL, authorizeUrl)
      putString(KEY_REDIRECT_URI, redirectUri)
      putBoolean(KEY_AUTHORIZATION_STARTED, authorizationStarted)
    }
  }

  private fun extractState(state: Bundle) {
    authorizeUrl = state.getString(KEY_AUTHORIZE_URL, null)
    redirectUri = state.getString(KEY_REDIRECT_URI, null)
    authorizationStarted = state.getBoolean(KEY_AUTHORIZATION_STARTED, false)
  }

  companion object {
    fun createStartIntent(
      context: Context,
      params: StartParams,
    ): Intent =
      createBaseIntent(context).apply {
        putExtra(KEY_AUTHORIZE_URL, params.authorizeUrl)
        putExtra(KEY_REDIRECT_URI, params.redirectUri)
      }

    private fun createBaseIntent(context: Context): Intent =
      Intent(context, CriiptoVerifyActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
  }
}
