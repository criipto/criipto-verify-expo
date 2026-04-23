import { requireNativeModule } from "expo-modules-core";

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
  return await module.login(params);
}
