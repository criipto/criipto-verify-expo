export type Action = "confirm" | "accept" | "approve" | "sign" | "login";
export type Prompt = "login" | "none" | "consent" | "consent_revoke";
export type Claims = {
  iss: string;
  aud: string;
  identityscheme: string;
  authenticationtype: string;
  sub: string;
  iat: number;
  exp: number;
  [key: string]: string | number;
};

export class OAuth2Error extends Error {
  error: string;
  error_description?: string;
  state?: string;
  trace_id?: string;

  constructor(error: string, error_description?: string, state?: string, trace_id?: string) {
    super(error + (error_description ? ` (${error_description})` : ""));
    this.name = "OAuth2Error";
    this.error = error;
    this.error_description = error_description;
    this.state = state;
    this.trace_id = trace_id;
  }
}

export class UserCancelledError extends OAuth2Error {
  constructor(trace_id?: string) {
    super("access_denied", "User cancelled login", undefined, trace_id);
    this.name = "UserCancelledError";
  }
}

export class NoSuitableBrowserError extends Error {
  trace_id?: string;

  constructor(trace_id?: string) {
    super("No suitable browser found");
    this.name = "NoSuitableBrowserError";
    this.trace_id = trace_id;
  }
}

export class IduraVerifyInternalError extends Error {
  trace_id?: string;

  constructor(message: string, trace_id?: string) {
    super(message);
    this.name = "IduraVerifyInternalError";
    this.trace_id = trace_id;
  }
}

export class ModuleNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModuleNotConfiguredError";
  }
}

export class UnknownPromptError extends Error {
  value: string;

  constructor(value: string) {
    super(`Unknown prompt value: '${value}'`);
    this.name = "UnknownPromptError";
    this.value = value;
  }
}

export type AcrValues = "urn:grn:authn:se:bankid:same-device" | string;
