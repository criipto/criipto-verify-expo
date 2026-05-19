import { createContext } from "react";

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

  constructor(error: string, error_description?: string, state?: string) {
    super(error + (error_description ? ` (${error_description})` : ""));
    this.name = "OAuth2Error";
    this.error = error;
    this.error_description = error_description;
    this.state = state;
  }
}

export class UserCancelledError extends OAuth2Error {
  constructor() {
    super("access_denied", "User cancelled login");
    this.name = "UserCancelledError";
  }
}

export class NoSuitableBrowserError extends Error {
  constructor() {
    super("No suitable browser found");
    this.name = "NoSuitableBrowserError";
  }
}

export class IduraVerifyInternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IduraVerifyInternalError";
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

export interface CriiptoVerifyContextInterface {
  login: (
    acrValues: AcrValues,
    redirectUri: string,
    params?: {
      scope: string;
      login_hint: string;
      preferEphemeralSession?: boolean;
      action?: Action;
      prompt?: Prompt;
    },
  ) => Promise<{ id_token: string; claims: Claims } | OAuth2Error | Error>;

  logout: () => Promise<void>;

  claims: Claims | null;
  error: Error | OAuth2Error | null;
}

/**
 * @ignore
 */
const stub = (): never => {
  throw new Error("You forgot to wrap your component in <CriiptoVerifyProvider>.");
};

/**
 * @ignore
 */
const initialContext = {
  login: stub,
  logout: stub,
  claims: null,
  error: null,
};

const CriiptoVerifyContext = createContext<CriiptoVerifyContextInterface>(initialContext);

export default CriiptoVerifyContext;
