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
  trace_id: string;
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
      return { id_token: result.idToken, trace_id: result.traceId };
    case "UserCancelled":
      throw new UserCancelledError(result.traceId ?? undefined);
    case "NoSuitableBrowser":
      throw new NoSuitableBrowserError(result.traceId ?? undefined);
    case "OAuthError":
      throw new OAuth2Error(
        result.error,
        result.errorDescription ?? undefined,
        undefined,
        result.traceId ?? undefined,
      );
    case "InternalError":
      throw new IduraVerifyInternalError(result.message, result.traceId ?? undefined);
    case "ModuleNotConfigured":
      throw new ModuleNotConfiguredError(result.message);
    case "UnknownPrompt":
      throw new UnknownPromptError(result.value);
  }
}
