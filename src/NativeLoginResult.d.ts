export type NativeLoginResult =
  | { kind: "Success"; idToken: string; traceId: string }
  | { kind: "UserCancelled"; traceId: string | null }
  | { kind: "NoSuitableBrowser"; traceId: string | null }
  | { kind: "OAuthError"; error: string; errorDescription: string | null; traceId: string | null }
  | { kind: "InternalError"; message: string; traceId: string | null }
  | { kind: "ModuleNotConfigured"; message: string }
  | { kind: "UnknownPrompt"; value: string };
