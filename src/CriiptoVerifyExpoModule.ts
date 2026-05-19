import { requireNativeModule } from "expo-modules-core";

import {
  Action,
  IduraVerifyInternalError,
  ModuleNotConfiguredError,
  NoSuitableBrowserError,
  OAuth2Error,
  Prompt,
  UnknownPromptError,
  UserCancelledError,
} from "./context";
import type { NativeLoginResult } from "./NativeLoginResult";

export interface LoginParams {
  acrValues: string;
  scope?: string;
  loginHint?: string;
  prompt?: Prompt;
  action?: Action;
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
  const result: NativeLoginResult = await module.login(params);
  switch (result.kind) {
    case "Success":
      return { id_token: result.idToken };
    case "UserCancelled":
      throw new UserCancelledError();
    case "NoSuitableBrowser":
      throw new NoSuitableBrowserError();
    case "OAuthError":
      throw new OAuth2Error(result.error, result.errorDescription ?? undefined);
    case "InternalError":
      throw new IduraVerifyInternalError(result.message);
    case "ModuleNotConfigured":
      throw new ModuleNotConfiguredError(result.message);
    case "UnknownPrompt":
      throw new UnknownPromptError(result.value);
  }
}
