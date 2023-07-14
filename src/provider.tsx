import React, { useMemo } from 'react';
import TextEncoding from 'text-encoding';
import * as crypto from 'expo-crypto';
import {decode, encode} from 'base-64';
import CriiptoVerifyContext from './context';
import { generatePlatformPKCE } from '@criipto/oidc';

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoding.TextEncoder;
}

if (!global.btoa) {
    global.btoa = encode;
}

if (!global.atob) {
    global.atob = decode;
}

interface CriiptoVerifyProviderOptions {
  domain: string
  clientID: string,
  children: React.ReactNode
}

function generatePKCE() {
  return generatePlatformPKCE({
    getRandomValues: crypto.getRandomValues.bind(crypto),
    subtle: {
      digest: crypto.digest.bind(crypto)
    }
  });
}

const CriiptoVerifyProvider = (props: CriiptoVerifyProviderOptions) : JSX.Element => {
  const context = useMemo(() => {
    return {
      async login() {
        const pkce = await generatePKCE();
        console.log(pkce);
      }
    }
  }, []);

  return (
    <CriiptoVerifyContext.Provider value={context}>
      {props.children}
    </CriiptoVerifyContext.Provider>
  );
}

export default CriiptoVerifyProvider;