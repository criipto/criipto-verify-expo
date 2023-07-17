import React, { useCallback, useMemo, useState } from 'react';
import {Platform} from 'react-native';
import TextEncoding from 'text-encoding';
import * as crypto from 'expo-crypto';
import {decode, encode} from 'base-64';
import jwtDecode from 'jwt-decode';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import 'react-native-url-polyfill/auto';
import { buildAuthorizeURL, codeExchange, generatePlatformPKCE, OpenIDConfigurationManager } from '@criipto/oidc';

import CriiptoVerifyContext, { CriiptoVerifyContextInterface, OAuth2Error, Claims } from './context';
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

interface SwedishBankIDInitial {
  launchLinks: {
    universalLink: string,
    customFileHandlerUrl: string,
    cancelUrl: string, 
    completeUrl: string,
    pollUrl: null
  }
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

  const [error, setError] = useState<OAuth2Error | Error | null>(null);
  const [claims, setClaims] = useState<Claims | null>(null);

  const login : CriiptoVerifyContextInterface["login"] = useCallback(async (acrValues, redirectUri) => {
    const discovery = await openIDConfigurationManager.fetch();
    const pkce = await generatePKCE();
    const authorizeUrl = buildAuthorizeURL(discovery, {
      redirect_uri: redirectUri,
      scope: 'openid',
      response_mode: acrValues === 'urn:grn:authn:se:bankid:same-device' ? 'json' : 'query',
      response_type: 'code',
      acr_values: acrValues,
      code_challenge: pkce.code_challenge,
      code_challenge_method: pkce.code_challenge_method,
      prompt: 'login',
      login_hint: `appswitch:${Platform.OS}`
    });

    if (acrValues === 'urn:grn:authn:se:bankid:same-device') {
      const response = await fetch(authorizeUrl);
      const payload : SwedishBankIDInitial = await response.json();
      console.log(payload);

      console.log(payload.launchLinks.universalLink);
      await Linking.openURL(payload.launchLinks.universalLink);
      throw new Error('Not implemented yet');
    }

    const result = await WebBrowser.openAuthSessionAsync(authorizeUrl.href, redirectUri);
    if (result.type === 'success') {
      const url = new URL(result.url);
      if (url.searchParams.get('code')) {
        const response = await codeExchange(discovery, {
          code: url.searchParams.get('code')!,
          redirect_uri: redirectUri,
          code_verifier: pkce.code_verifier
        });

        if ("error" in response) {
          throw new OAuth2Error(response.error, response.error_description, response.state);
        } else if ("id_token" in response) {
          return {
            id_token: response.id_token,
            claims: jwtDecode(response.id_token)
          }
        } else {
          throw new Error('Unexpected code exchange response: ' + JSON.stringify(response));
        }
      } else if (url.searchParams.get('error')) {
        const error = new OAuth2Error(
          url.searchParams.get('error')!,
          url.searchParams.get('error_description') ?? undefined,
          url.searchParams.get('state') ?? undefined
        );

        throw error;
      } else {
        throw new Error('Unexpected URL response: ' + result.url);
      }
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new OAuth2Error('access_denied', 'User cancelled/dismissed browser');
    } else {
      throw new Error('Unexpected browser results: ' + JSON.stringify(result));
    }
  }, [openIDConfigurationManager, setError, setClaims]);

  const context = useMemo<CriiptoVerifyContextInterface>(() => {
    return {
      login: async (...args) => {
        return login(...args).then(result => {
          if ("claims" in result) {
            setClaims(result.claims);
          }
          if (result instanceof Error) {
            setError(result);
          }
          return result;
        }).catch(error => {
          setError(error);
          throw error;
        });
      },
      claims,
      error
    };
  }, [login, claims, error, setClaims, setError]);

  return (
    <CriiptoVerifyContext.Provider value={context}>
      {props.children}
    </CriiptoVerifyContext.Provider>
  );
}

export default CriiptoVerifyProvider;