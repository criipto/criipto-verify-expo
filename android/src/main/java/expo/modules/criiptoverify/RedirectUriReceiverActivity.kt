package expo.modules.criiptoverify

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * This is very heavily inspired by
 * https://github.com/openid/AppAuth-Android/blob/4df1ebac07436d7e8d68cbb98207cc40fe55a39d/library/java/net/openid/appauth/RedirectUriReceiverActivity.java
 *
 * The activity which holds the custom tab (`CriiptoVerifyActivity`) expects to be called with
 * `FLAG_ACTIVITY_CLEAR_TOP`, when receiving a redirect URL. This is in order to remove the custom
 * tab from the stack.
 *
 * This works in chrome, but not in firefox. Therefore, we capture the intent here, and create a new
 * intent, which starts `CriiptoVerifyActivity` with `FLAG_ACTIVITY_CLEAR_TOP` set.
 */
public class RedirectUriReceiverActivity : AppCompatActivity() {
  @Override
  override fun onCreate(savedInstanceBundle: Bundle?) {
    super.onCreate(savedInstanceBundle)

    val data = intent!!.getData()!!
    if (data.getQueryParameter("error") != null || data.getQueryParameter("code") != null) {
      // If either code or error is set, this is a regular redirect
      startActivity(CriiptoVerifyActivity.createResponseHandlingIntent(this, data))
    }
    // Otherwise, it is a MitID app switch, and we should just switch back to the app, without
    // starting a new activity

    finish()
  }
}
