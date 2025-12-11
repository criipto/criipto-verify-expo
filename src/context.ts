import { createContext } from 'react';

export const actions = ['confirm', 'accept', 'approve', 'sign', 'login'] as const;
export type Action = typeof actions[number];
export type Claims = {
  iss: string
  aud: string
  identityscheme: string
  authenticationtype: string
  sub: string
  iat: number
  exp: number
  [key: string]: string | number
}

export class OAuth2Error extends Error {
  error: string;
  error_description?: string;
  state?: string;

  constructor(error: string, error_description?: string, state?: string) {
    super(error + (error_description ? ` (${error_description})` : ''));
    this.name = "OAuth2Error";
    this.error = error;
    this.error_description = error_description;
    this.state = state;
  }
}

export class UserCancelledError extends OAuth2Error {
  constructor() {
    super('access_denied', 'User cancelled login');
    this.name = "UserCancelledError";
  }
}

export type AcrValues = 
  'urn:grn:authn:se:bankid:same-device' | string

export interface CriiptoVerifyContextInterface {
  login: (
    acrValues: AcrValues,
    redirectUri: string,
    params?: {scope: string, login_hint: string, preferEphemeralSession?: boolean}
  ) => Promise<{id_token: string, claims: Claims} | OAuth2Error | Error>,

  logout: () => Promise<void>,

  claims: Claims | null,
  error: Error | OAuth2Error | null
}

/**
 * @ignore
 */
const stub = (): never => {
  throw new Error('You forgot to wrap your component in <CriiptoVerifyProvider>.');
};

/**
 * @ignore
 */
const initialContext = {
  login: stub,
  logout: stub,
  claims: null,
  error: null
};

const CriiptoVerifyContext = createContext<CriiptoVerifyContextInterface>(initialContext);

export default CriiptoVerifyContext;