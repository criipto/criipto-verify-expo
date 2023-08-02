import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {Platform} from 'react-native';
import TextEncoding from 'text-encoding';
import * as crypto from 'expo-crypto';
import Constants, {ExecutionEnvironment} from 'expo-constants';
import {decode, encode} from 'base-64';
import jwtDecode from 'jwt-decode';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import 'react-native-url-polyfill/auto';
import { AuthorizeURLOptions, buildAuthorizeURL, codeExchange, generatePlatformPKCE, OpenIDConfiguration, OpenIDConfigurationManager } from '@criipto/oidc';

import CriiptoVerifyContext, { CriiptoVerifyContextInterface, OAuth2Error, Claims, UserCancelledError } from './context';
import { createMemoryStorage } from './memory-storage';
import { SwedishBankIDTransaction, DanishMitIDTransaction, Transaction } from './transaction';
import useAppState from './hooks/useAppState';

import * as CriiptoVerifyExpoModule from './CriiptoVerifyExpoModule';

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
type PKCE = Awaited<ReturnType<typeof generatePKCE>>

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
    const authorizeOptions : AuthorizeURLOptions = {
      redirect_uri: redirectUri,
      scope: `openid${params?.scope ? ' '+params.scope : ''}`,
      response_mode: acrValues === 'urn:grn:authn:se:bankid:same-device' ? 'json' : 'query',
      response_type: 'code',
      acr_values: acrValues,
      code_challenge: pkce.code_challenge,
      code_challenge_method: pkce.code_challenge_method,
      prompt: 'login',
      login_hint: `appswitch:${Platform.OS}${params?.login_hint ? ' '+params.login_hint : ''}`
    };

    const authorizeUrl = buildAuthorizeURL(discovery, authorizeOptions);
    authorizeUrl.searchParams.set('criipto_sdk', `@criipto/verify-expo@1.0.0`)

    if (acrValues === 'urn:grn:authn:se:bankid:same-device') {
      const authorizeResponse = await fetch(authorizeUrl);
      if (authorizeResponse.status >= 400) throw new Error(await authorizeResponse.text());
      const authorizePayload : SwedishBankIDInitial = await authorizeResponse.json();
      
      const transactionPromise = new Promise<void>((resolve, reject) => {
        const transaction = new SwedishBankIDTransaction(redirectUri, resolve, async () => {
          await fetch(authorizePayload.cancelUrl);
          reject(new UserCancelledError());
        });

        setTransaction(transaction);
      });

      await Linking.openURL(authorizePayload.launchLinks.universalLink);
      await transactionPromise;
      
      const completeResponse = await fetch(authorizePayload.completeUrl);
      if (completeResponse.status >= 400) throw new Error(await completeResponse.text());
      const completePayload : {location: string} = await completeResponse.json();
      return await handleURL(discovery, pkce, redirectUri, new URL(completePayload.location));
    }

    if (acrValues.startsWith('urn:grn:authn:dk:mitid:')) {
      const isUniversalLink = redirectUri.startsWith('https://');

      if (isUniversalLink && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
        throw new Error('MitID with universal links will not work in Expo Go');
      }

      const resumeUrl = redirectUri.startsWith('https://') ? redirectUri : null;
      
      if (Platform.OS === 'android' && isUniversalLink) {
        const url = await CriiptoVerifyExpoModule.start({
          authorizeUrl: authorizeUrl.href,
          redirectUri: redirectUri
        });
        if (url === null) {
          throw new UserCancelledError();
        }
        return await handleURL(discovery, pkce, redirectUri, new URL(url));
      }

      const transactionPromise = new Promise<string>((resolve, reject) => {
        const transaction = new DanishMitIDTransaction(redirectUri, resumeUrl, resolve);
        setTransaction(transaction);
      });
      const browserResult = WebBrowser.openAuthSessionAsync(authorizeUrl.href, redirectUri, {
        createTask: Platform.OS === 'android' ? false : undefined
      });

      const url = await Promise.race([
        transactionPromise,
        browserResult.then(result => {
          if (result.type === 'success') return result.url;
          if (result.type === 'dismiss') throw new UserCancelledError();
          throw new Error('Unexpected browser result: ' + JSON.stringify(result));
        }),
      ]);
      return await handleURL(discovery, pkce, redirectUri, new URL(url));
    }

    const result = await WebBrowser.openAuthSessionAsync(authorizeUrl.href, redirectUri);
    
    if (result.type === 'success') {
      const url = new URL(result.url);
      return await handleURL(discovery, pkce, redirectUri, url);
    } else {
      if (result.type === 'dismiss') throw new UserCancelledError();
      throw new Error('Unexpected browser result: ' + JSON.stringify(result));
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
      logout: async () => {
        setClaims(null);
        setError(null);
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

async function handleURL(discovery: OpenIDConfiguration, pkce: PKCE, redirectUri: string, url: URL) {
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