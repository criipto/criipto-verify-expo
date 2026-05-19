export type NativeLoginResult =
  | { kind: "Success"; idToken: string }
  | { kind: "UserCancelled" }
  | { kind: "NoSuitableBrowser" }
  | { kind: "OAuthError"; error: string; errorDescription: string | null }
  | { kind: "InternalError"; message: string }
  | { kind: "ModuleNotConfigured"; message: string }
  | { kind: "UnknownPrompt"; value: string };
