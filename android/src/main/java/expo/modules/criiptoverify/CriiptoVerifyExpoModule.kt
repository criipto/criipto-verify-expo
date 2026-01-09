package expo.modules.criiptoverify

import android.app.Activity
import android.content.Context
import android.os.Bundle
import android.util.Log
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val REQUEST_CODE = 20
private const val TAG = "CriiptoVerifyExpoModule"

class CriiptoVerifyExpoModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  private val currentActivity
    get() = appContext.currentActivity ?: throw Exceptions.MissingActivity()
  private var pendingPromise: Promise? = null

  override fun definition() =
    ModuleDefinition {
      Name("CriiptoVerifyExpo")
      AsyncFunction("startAsync") { params: StartParams, promise: Promise ->
        pendingPromise = promise
        currentActivity.startActivityForResult(
          CriiptoVerifyActivity.createStartIntent(context, params),
          REQUEST_CODE,
        )
      }

      OnActivityResult { _, payload ->
        Log.v(TAG, "CriiptoVerifyExpoModule.OnActivityResult: " + payload.requestCode)
        if (payload.requestCode != REQUEST_CODE) {
          return@OnActivityResult
        }

        Log.v(TAG, "CriiptoVerifyExpoModule.OnActivityResult: " + payload.data?.data.toString())
        if (payload.data?.data == null) {
          pendingPromise?.resolve(null)
          pendingPromise = null
        } else {
          pendingPromise?.resolve(payload.data?.data.toString())
          pendingPromise = null
        }
      }
    }
}
