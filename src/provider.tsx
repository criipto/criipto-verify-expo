import React, { useCallback, useMemo, useState, ReactElement } from "react";
import jwtDecode from "jwt-decode";

import CriiptoVerifyContext, {
  CriiptoVerifyContextInterface,
  OAuth2Error,
  Claims,
} from "./context";

import * as CriiptoVerifyExpoModule from "./CriiptoVerifyExpoModule";

interface CriiptoVerifyProviderOptions {
  children: React.ReactNode;
}

/**
 * Wraps the app in a context that exposes `login()` and `logout()` to the rest of the tree.
 *
 * Both platforms route through the native Idura Verify SDK — the Expo plugin reads `domain`
 * and `clientID` from `app.json` and bakes them into AndroidManifest meta-data + iOS
 * Info.plist, so the JS layer never sees those values. This provider is a thin React wrapper
 * around the native module call: state for the last login's claims / error, and a memoised
 * context value.
 */
const CriiptoVerifyProvider = (_props: CriiptoVerifyProviderOptions): ReactElement => {
  const [error, setError] = useState<OAuth2Error | Error | null>(null);
  const [claims, setClaims] = useState<Claims | null>(null);

  const login: CriiptoVerifyContextInterface["login"] = useCallback(
    async (acrValues, params) => {
      const { id_token } = await CriiptoVerifyExpoModule.login({
        acrValues,
        scope: params?.scope,
        loginHint: params?.login_hint,
        prompt: "login",
      });
      return {
        id_token,
        claims: jwtDecode<Claims>(id_token),
      };
    },
    [],
  );

  const context = useMemo<CriiptoVerifyContextInterface>(
    () => ({
      login: async (...args) =>
        login(...args)
          .then((result) => {
            setClaims(result.claims);
            return result;
          })
          .catch((err) => {
            setError(err);
            throw err;
          }),
      logout: async () => {
        setClaims(null);
        setError(null);
      },
      claims,
      error,
    }),
    [login, claims, error],
  );

  return (
    <CriiptoVerifyContext.Provider value={context}>{_props.children}</CriiptoVerifyContext.Provider>
  );
};

export default CriiptoVerifyProvider;
