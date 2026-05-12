import { requireNativeModule } from "expo-modules-core";

import { OAuth2Error, UserCancelledError } from "./context";

export interface LoginParams {
  acrValues: string;
  scope?: string;
  loginHint?: string;
  prompt?: "login" | "none" | "consent" | "consent_revoke";
}

export interface LoginResult {
  id_token: string;
}

/**
 * Android-only. Delegates to the Idura Verify Android SDK, which handles
 * OIDC discovery, PKCE, the browser flow (Auth Tab / Custom Tab), MitID
 * app switching, and token exchange internally. Returns the raw `id_token`
 * so the caller can decode claims with the same `jwt-decode` path used on iOS.
 */
export async function login(params: LoginParams): Promise<LoginResult> {
  const module = requireNativeModule("CriiptoVerifyExpo");
  try {
    return await module.login(params);
  } catch (e) {
    throw translateNativeError(e);
  }
}

// Translates the `code` field set by the Kotlin module's CodedException subclasses
// (see android/.../CriiptoVerifyExpoModule.kt) back into the cross-platform error
// types consumers already handle on iOS. ERR_OAUTH packs `error` and
// `error_description` into the message separated by a tab; everything else is
// passed through unchanged.
function translateNativeError(e: unknown): unknown {
  const code = (e as { code?: string } | null)?.code;
  const message = (e as { message?: string } | null)?.message ?? "";
  if (code === "ERR_USER_CANCELLED") {
    return new UserCancelledError();
  }
  if (code === "ERR_OAUTH") {
    const tab = message.indexOf("\t");
    const error = tab === -1 ? message : message.slice(0, tab);
    const description = tab === -1 ? "" : message.slice(tab + 1);
    return new OAuth2Error(error, description.length ? description : undefined);
  }
  return e;
}
