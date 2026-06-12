import { requireNativeModule } from "expo";
import jwtDecode from "jwt-decode";

import {
  Action,
  Claims,
  IduraVerifyInternalError,
  ModuleNotConfiguredError,
  NoSuitableBrowserError,
  OAuth2Error,
  Prompt,
  UnknownPromptError,
  UserCancelledError,
} from "./types";
import type { NativeLoginResult } from "./NativeLoginResult";

export interface LoginParams {
  acrValues: string;
  scope?: string;
  loginHint?: string;
  prompt?: Prompt;
  action?: Action;
  preferEphemeralSession?: boolean;
}

export interface LoginResult {
  id_token: string;
  trace_id: string;
  claims: Claims;
}

/**
 * Delegates to the native Idura Verify SDK on both iOS and Android. The native
 * code handles OIDC discovery, PKCE, the browser flow (ASWebAuthenticationSession
 * on iOS, Auth Tab / Custom Tab on Android), app switching for MitID/BankID, and
 * token exchange. The JS side only has to forward parameters, decode the JWT,
 * and rethrow typed errors. `preferEphemeralSession` is meaningful only on iOS —
 * the Android SDK has no equivalent (Custom Tab sessions don't share cookies
 * with the browser).
 */
export async function login(params: LoginParams): Promise<LoginResult> {
  const module = requireNativeModule("CriiptoVerifyExpo");
  const result: NativeLoginResult = await module.login(params);
  switch (result.kind) {
    case "Success":
      return {
        id_token: result.idToken,
        trace_id: result.traceId,
        claims: jwtDecode<Claims>(result.idToken),
      };
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
