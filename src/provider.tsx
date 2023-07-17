import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SwedishBankIDTransaction, Transaction } from './transaction';
import useAppState from './hooks/useAppState';

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
  cancelUrl: string
  completeUrl: string
  launchLinks: {
    customFileHandlerUrl: string
    universalLink: string
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
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  useAppState(() => {
    if (!transaction) return;
    transaction.onForeground();
  }, [transaction]);

  useEffect(() => {
    if (!transaction) return;
    const urlCallback : Linking.URLListener = (event) => {
      transaction.onUrl(event.url);
    }
    const subscription = Linking.addEventListener('url', urlCallback);
    return () => subscription.remove();
  }, [transaction]);

  const login : CriiptoVerifyContextInterface["login"] = useCallback(async (acrValues, redirectUri, params) => {
    const discovery = await openIDConfigurationManager.fetch();
    const pkce = await generatePKCE();
    const authorizeUrl = buildAuthorizeURL(discovery, {
      redirect_uri: redirectUri,
      scope: `openid${params?.scope ? ' '+params.scope : ''}`,
      response_mode: acrValues === 'urn:grn:authn:se:bankid:same-device' ? 'json' : 'query',
      response_type: 'code',
      acr_values: acrValues,
      code_challenge: pkce.code_challenge,
      code_challenge_method: pkce.code_challenge_method,
      prompt: 'login',
      login_hint: `appswitch:${Platform.OS}${params?.login_hint ? ' '+params.login_hint : ''}`
    });
    authorizeUrl.searchParams.set('criipto_sdk', `@criipto/verify-expo@1.0.0`)

    async function handleURL(url: URL) {
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
            claims: jwtDecode<Claims>(response.id_token)
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
        throw new Error('Unexpected URL response: ' + url.href);
      }
    }

    if (acrValues === 'urn:grn:authn:se:bankid:same-device') {
      const authorizeResponse = await fetch(authorizeUrl);
      if (authorizeResponse.status >= 400) throw new Error(await authorizeResponse.text());
      const authorizePayload : SwedishBankIDInitial = await authorizeResponse.json();
      
      const transactionPromise = new Promise<void>((resolve, reject) => {
        const transaction = new SwedishBankIDTransaction(redirectUri, resolve, async () => {
          await fetch(authorizePayload.cancelUrl);
          reject(new OAuth2Error('access_denied', 'User cancelled login'));
        });

        setTransaction(transaction);
      });

      await Linking.openURL(authorizePayload.launchLinks.universalLink);
      await transactionPromise;
      
      const completeResponse = await fetch(authorizePayload.completeUrl);
      if (completeResponse.status >= 400) throw new Error(await completeResponse.text());
      const completePayload : {location: string} = await completeResponse.json();
      return await handleURL(new URL(completePayload.location));
    }

    const result = await WebBrowser.openAuthSessionAsync(authorizeUrl.href, redirectUri);
    if (result.type === 'success') {
      const url = new URL(result.url);
      return await handleURL(url);
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