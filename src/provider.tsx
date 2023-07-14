import React, { useMemo } from 'react';
import {Platform} from 'react-native';
import TextEncoding from 'text-encoding';
import * as crypto from 'expo-crypto';
import {decode, encode} from 'base-64';
import CriiptoVerifyContext, { CriiptoVerifyContextInterface } from './context';
import { generatePlatformPKCE, OpenIDConfigurationManager } from '@criipto/oidc';
import { createMemoryStorage } from './memory-storage';

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
  const openIDConfigurationManager = useMemo(() => {
    return new OpenIDConfigurationManager(`https://${props.domain}`, props.clientID, createMemoryStorage())
  }, [props.domain, props.clientID]);

  const context = useMemo<CriiptoVerifyContextInterface>(() => {
    return {
      async login(acrValues) {
        const discovery = await openIDConfigurationManager.fetch();
        const pkce = await generatePKCE();
        console.log(pkce);
        console.log(discovery);
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