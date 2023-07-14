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

export type AcrValues = 
  'urn:grn:authn:se:bankid:same-device' | string

export interface CriiptoVerifyContextInterface {
  login: (acrValues: AcrValues) => Promise<void>,
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
  login: stub
};

const CriiptoVerifyContext = createContext<CriiptoVerifyContextInterface>(initialContext);

export default CriiptoVerifyContext;